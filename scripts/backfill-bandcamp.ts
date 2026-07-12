import { db, closeDb } from "@/db/client";
import { shows } from "@/db/schema";
import { eq, isNull } from "drizzle-orm";

const MUSIC_URL = "https://goosetheband.bandcamp.com/music";
const USER_AGENT = "goose-index/backfill (github.com/tsvb/goose-index)";
const PER_ALBUM_DELAY_MS = 800; // gentle throttle against bandcamp
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1500;

async function fetchWithRetry(url: string): Promise<string | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "text/html" } });
      if (res.status === 429 || res.status >= 500) {
        console.warn(`fetch ${url} -> ${res.status}, retrying (attempt ${attempt}/${MAX_RETRIES})`);
      } else if (!res.ok) {
        console.warn(`fetch ${url} -> ${res.status}, giving up`);
        return null;
      } else {
        return await res.text();
      }
    } catch (err) {
      console.warn(`fetch ${url} threw (attempt ${attempt}/${MAX_RETRIES}):`, err);
    }
    await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
  }
  return null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type AlbumLink = { date: string; url: string };

/** The /music page lists every release; grab every /album/YYYY-MM-DD-… href. */
function extractAlbumLinks(musicHtml: string): AlbumLink[] {
  const seen = new Set<string>();
  const out: AlbumLink[] = [];
  const re = /href="(\/album\/(\d{4}-\d{2}-\d{2})[^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(musicHtml)) !== null) {
    const url = `https://goosetheband.bandcamp.com${m[1]}`;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, date: m[2] });
  }
  return out;
}

/** Bandcamp embeds a JSON-LD MusicAlbum block; the album `description` field
 * carries the note text. Returns null if the marker isn't present — we don't
 * fall back to the raw description, since it's usually generic release copy. */
function extractCoachNotes(albumHtml: string): string | null {
  const jsonLd = albumHtml.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
  if (!jsonLd) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonLd[1]);
  } catch {
    return null;
  }
  const album = Array.isArray(parsed)
    ? (parsed.find((x): x is { "@type": string; description?: string } =>
        typeof x === "object" && x !== null && (x as { "@type"?: unknown })["@type"] === "MusicAlbum") ?? null)
    : parsed;
  const desc = (album as { description?: string } | null)?.description;
  if (typeof desc !== "string") return null;
  // Only accept the release when it explicitly carries a "Coach's Notes"
  // section — the raw description is generic release copy for most albums.
  const marker = desc.match(/coach['’]?s\s*notes:\s*([\s\S]*)$/i);
  if (!marker) return null;
  const notes = marker[1].trim();
  return notes.length > 0 ? notes : null;
}

/** Reads the /album/… slug portion after the date as the bandcamp album id. */
function extractAlbumId(url: string): string | null {
  const m = url.match(/\/album\/(.+)$/);
  return m ? m[1] : null;
}

async function main() {
  console.log(`fetching ${MUSIC_URL}`);
  const musicHtml = await fetchWithRetry(MUSIC_URL);
  if (!musicHtml) throw new Error("could not fetch bandcamp music page");
  const links = extractAlbumLinks(musicHtml);
  console.log(`found ${links.length} dated album links on /music`);
  const byDate = new Map(links.map((l) => [l.date, l]));

  const candidates = await db
    .select({ showId: shows.showId, showDate: shows.showDate })
    .from(shows)
    .where(isNull(shows.coachNotes));
  console.log(`${candidates.length} shows without coach_notes to try`);

  let updated = 0;
  let skippedNoAlbum = 0;
  let skippedNoNotes = 0;
  let skippedFetchFailed = 0;

  for (const s of candidates) {
    const date = typeof s.showDate === "string" ? s.showDate : String(s.showDate);
    const album = byDate.get(date);
    if (!album) {
      skippedNoAlbum++;
      continue;
    }
    const albumHtml = await fetchWithRetry(album.url);
    if (!albumHtml) {
      console.warn(`no html for ${album.url}`);
      skippedFetchFailed++;
      continue;
    }
    const notes = extractCoachNotes(albumHtml);
    if (!notes) {
      skippedNoNotes++;
    } else {
      await db
        .update(shows)
        .set({
          bandcampAlbumId: extractAlbumId(album.url),
          bandcampUrl: album.url,
          coachNotes: notes,
        })
        .where(eq(shows.showId, s.showId));
      updated++;
      console.log(`updated ${date} (${notes.length} chars)`);
    }
    await sleep(PER_ALBUM_DELAY_MS);
  }

  const totalAccounted = updated + skippedNoAlbum + skippedNoNotes + skippedFetchFailed;
  console.log(
    `done. updated=${updated} skipped_no_album=${skippedNoAlbum} ` +
    `skipped_no_notes=${skippedNoNotes} skipped_fetch_failed=${skippedFetchFailed} ` +
    `(${totalAccounted}/${candidates.length} candidates accounted for)`,
  );
  await closeDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeDb();
  process.exit(1);
});

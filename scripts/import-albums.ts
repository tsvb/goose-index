import "dotenv/config";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import { classify, buildTitleIndex, normalizeTitle } from "./album-match";
import { announceTarget } from "./target";

/**
 * Loads the discography from the Bandcamp scrape into `albums` / `album_tracks`.
 *
 * elgoose is a setlist database and knows nothing about releases, so this is the
 * only source that can answer "which album is this song on?".
 *
 * Usage:
 *   npm run import-albums -- data/albums.jsonl [--dry-run]
 */

type Track = { track_num: number; title: string; duration_sec?: number | null };
type Release = {
  album_id: string | number;
  title: string;
  slug?: string | null;
  release_date?: string | null;
  num_tracks?: number | null;
  url?: string | null;
  tracks?: Track[] | null;
};


const file = process.argv[2] ?? "data/albums.jsonl";
const dryRun = process.argv.includes("--dry-run");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
announceTarget(url);
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client);

const releases: Release[] = readFileSync(file, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l) as Release);

const songRows = (await db.execute(sql`
  select song_id, name, is_original from songs order by is_original desc, song_id asc
`)) as unknown as { song_id: number; name: string; is_original: boolean }[];
const byTitle = buildTitleIndex(songRows);

let albums = 0;
let tracks = 0;
let matched = 0;
const unmatched: string[] = [];
const skipped: number[] = [0];

for (const r of releases) {
  const kind = classify(r.title);
  if (!kind) {
    skipped[0]++;
    continue;
  }
  const albumId = String(r.album_id);
  const list = (r.tracks ?? []).filter((t) => t?.title);

  if (!dryRun) {
    await db.execute(sql`
      insert into albums (album_id, title, slug, release_date, num_tracks, url, kind)
      values (${albumId}, ${r.title}, ${r.slug ?? null}, ${r.release_date ? r.release_date.slice(0, 10) : null},
              ${list.length}, ${r.url ?? null}, ${kind})
      on conflict (album_id) do update set
        title = excluded.title, slug = excluded.slug, release_date = excluded.release_date,
        num_tracks = excluded.num_tracks, url = excluded.url, kind = excluded.kind
    `);
  }
  albums++;

  for (const t of list) {
    const songId = byTitle.get(normalizeTitle(t.title)) ?? null;
    if (songId) matched++;
    else if (kind === "studio") unmatched.push(`${r.title} — ${t.title}`);
    tracks++;
    if (!dryRun) {
      await db.execute(sql`
        insert into album_tracks (album_id, track_num, title, song_id, duration_sec)
        values (${albumId}, ${t.track_num}, ${t.title}, ${songId},
                ${t.duration_sec != null ? Math.round(t.duration_sec) : null})
        on conflict (album_id, track_num) do update set
          title = excluded.title, song_id = excluded.song_id, duration_sec = excluded.duration_sec
      `);
    }
  }
}

console.log(
  `${dryRun ? "[dry-run] " : ""}albums=${albums} tracks=${tracks} matched=${matched} ` +
    `unmatched=${tracks - matched} skipped_show_tapes=${skipped[0]}`,
);
// Unmatched studio tracks are worth seeing: they're either interludes with no
// setlist entry, or a title elgoose spells differently — the second is a bug.
if (unmatched.length) {
  console.log(`\nunmatched studio tracks (${unmatched.length}):`);
  for (const u of unmatched.slice(0, 40)) console.log("  " + u);
  if (unmatched.length > 40) console.log(`  … and ${unmatched.length - 40} more`);
}

await client.end();

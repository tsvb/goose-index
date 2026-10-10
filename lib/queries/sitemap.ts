import { db } from "@/db/client";
import { performances, shows, songs } from "@/db/schema";
import { asc, isNotNull, sql } from "drizzle-orm";
import { cachedQuery } from "./cache";
import { etToday, today } from "./today";

/** A sitemap URL key and the date its page last took new data, if known. */
export type Dated<K> = { key: K; lastmod: string | undefined };

// Cache keys carry a "sitemap" prefix: these rows used to be bare keys/ids
// under "allShowDates" etc., and a Data Cache entry can outlive a deploy.

/**
 * The two facts a page's <lastmod> is built from, aggregated over the shows
 * behind it:
 *
 * - `played`: the latest of those shows that has happened. A setlist lands on
 *   or after its show date, so a played show's page has changed at least then.
 * - `updated`: the latest `updated_at` elgoose stamped on any of those show
 *   records (announcements, edits). Max over text is safe — elgoose writes
 *   "YYYY-MM-DD HH:MM:SS", which sorts as it reads.
 *
 * Cast to text so every driver (postgres-js, Neon, PGlite) hands back the
 * same "YYYY-MM-DD" string rather than some of them a Date.
 */
function stampColumns() {
  return {
    played: sql<string | null>`(max(${shows.showDate}) filter (where ${shows.showDate} <= ${today()}))::text`,
    updated: sql<string | null>`max(${shows.updatedAt})`,
  };
}

/** "YYYY-MM-DD" from the front of a timestamp, or null if it isn't a real date
 *  (elgoose is MySQL-backed; a "0000-00-00" zero date must not reach Google). */
function datePart(stamp: string | null): string | null {
  const d = stamp?.slice(0, 10);
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const roundTrip = new Date(`${d}T00:00:00Z`);
  return !isNaN(roundTrip.getTime()) && roundTrip.toISOString().slice(0, 10) === d ? d : null;
}

/**
 * A page's <lastmod>: the later of `played` and `updated`, never after today
 * (elgoose's clock is not ET's). Undefined when neither is known — an omitted
 * <lastmod> is honest; a guessed one teaches Google to ignore the rest.
 *
 * This under-reports rather than over-reports: an edit elgoose makes to a
 * setlist without touching the show record (a jam chart filed a week later)
 * isn't seen. Google still crawls on its own schedule; it just isn't nudged.
 */
export function lastmodOf(played: string | null, updated: string | null, todayEt: string = etToday()): string | undefined {
  const latest = [played, datePart(updated)].filter((d): d is string => d !== null).sort().at(-1);
  if (!latest) return undefined;
  return latest > todayEt ? todayEt : latest;
}

function dated<K>(rows: { key: K; played: string | null; updated: string | null }[]): Dated<K>[] {
  const todayEt = etToday();
  return rows.map((r) => ({ key: r.key, lastmod: lastmodOf(r.played, r.updated, todayEt) }));
}

/** Every distinct show date — two-show days share one /shows/[date] page. */
export async function allShowDates(): Promise<Dated<string>[]> {
  return cachedQuery("sitemapShowDates", [], async () =>
    dated(
      await db
        .select({ key: shows.showDate, ...stampColumns() })
        .from(shows)
        .groupBy(shows.showDate)
        .orderBy(asc(shows.showDate)),
    ),
  { varyByToday: true });
}

/** Slugs for every song that has one (slugs are backfilled by the nightly sync).
 *  A song's page moves when it's played, so its stamp is the shows it was
 *  played at; a never-played song has none and gets no <lastmod>. */
export async function allSongSlugs(): Promise<Dated<string>[]> {
  return cachedQuery("sitemapSongSlugs", [], async () =>
    dated(
      await db
        .select({ key: sql<string>`${songs.slug}`, ...stampColumns() })
        .from(songs)
        .leftJoin(performances, sql`${performances.songId} = ${songs.songId}`)
        .leftJoin(shows, sql`${shows.showId} = ${performances.showId}`)
        .where(isNotNull(songs.slug))
        .groupBy(songs.slug)
        .orderBy(asc(songs.slug)),
    ),
  { varyByToday: true });
}

/** Every year with a show on the books — /years/[year] pages. */
export async function allYears(): Promise<Dated<number>[]> {
  const year = sql<number>`extract(year from ${shows.showDate})::int`;
  return cachedQuery("sitemapYears", [], async () =>
    dated(await db.select({ key: year, ...stampColumns() }).from(shows).groupBy(year).orderBy(year)),
  { varyByToday: true });
}

/** Venues that have hosted at least one show — /venues/[id] pages. */
export async function allVenueIds(): Promise<Dated<number>[]> {
  return groupedByShowColumn("sitemapVenueIds", shows.venueId);
}

/** Tours with at least one show — /tours/[id] pages. */
export async function allTourIds(): Promise<Dated<number>[]> {
  return groupedByShowColumn("sitemapTourIds", shows.tourId);
}

async function groupedByShowColumn(key: string, column: typeof shows.venueId | typeof shows.tourId): Promise<Dated<number>[]> {
  return cachedQuery(key, [], async () =>
    dated(
      await db
        .select({ key: sql<number>`${column}`, ...stampColumns() })
        .from(shows)
        .where(isNotNull(column))
        .groupBy(column)
        .orderBy(asc(column)),
    ),
  { varyByToday: true });
}

/** The catalog as a whole — the stamp for pages that read across every show
 *  (the home page, section indexes, stats). */
export async function catalogLastmod(): Promise<string | undefined> {
  // null, not undefined, inside the cache: the Data Cache stores JSON.
  const stamp = await cachedQuery("sitemapCatalogLastmod", [], async () => {
    const [row] = await db.select(stampColumns()).from(shows);
    return row ? lastmodOf(row.played, row.updated) ?? null : null;
  }, { varyByToday: true });
  return stamp ?? undefined;
}

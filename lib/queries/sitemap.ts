import { db } from "@/db/client";
import { shows, songs } from "@/db/schema";
import { asc, isNotNull, sql } from "drizzle-orm";

function allRows(result: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return rows as Record<string, unknown>[];
}

/** Every distinct show date — two-show days share one /shows/[date] page. */
export async function allShowDates(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ date: shows.showDate })
    .from(shows)
    .orderBy(asc(shows.showDate));
  return rows.map((r) => r.date);
}

/** Slugs for every song that has one (slugs are backfilled by the nightly sync). */
export async function allSongSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: songs.slug })
    .from(songs)
    .where(isNotNull(songs.slug))
    .orderBy(asc(songs.slug));
  return rows.map((r) => r.slug as string);
}

/** Every year with a show on the books — /years/[year] pages. */
export async function allYears(): Promise<number[]> {
  const year = sql<number>`extract(year from ${shows.showDate})::int`;
  const rows = await db
    .selectDistinct({ year })
    .from(shows)
    .orderBy(year);
  return rows.map((r) => r.year);
}

/** Venues that have hosted at least one show — /venues/[id] pages. */
export async function allVenueIds(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ id: shows.venueId })
    .from(shows)
    .where(isNotNull(shows.venueId))
    .orderBy(asc(shows.venueId));
  return rows.map((r) => r.id as number);
}

/** Tours with at least one show — /tours/[id] pages. */
export async function allTourIds(): Promise<number[]> {
  const rows = await db
    .selectDistinct({ id: shows.tourId })
    .from(shows)
    .where(isNotNull(shows.tourId))
    .orderBy(asc(shows.tourId));
  return rows.map((r) => r.id as number);
}

/** Every forum board slug — /forum/[board] pages. Threads stay out of the sitemap in v1. */
export async function allBoardSlugs(): Promise<string[]> {
  const rows = allRows(await db.execute(sql`select slug from forum_boards order by position`));
  return rows.map((r) => String(r.slug));
}

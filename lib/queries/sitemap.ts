import { db } from "@/db/client";
import { shows, songs } from "@/db/schema";
import { asc, isNotNull } from "drizzle-orm";

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

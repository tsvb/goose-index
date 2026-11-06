import { sql, eq, inArray } from "drizzle-orm";
import { chunk } from "../lib/util";
import * as schema from "./schema";
import type { AppDb } from "./schema";
import type {
  VenueRow, TourRow, SongRow, ShowRow, PerformanceRow,
} from "../lib/elgoose/types";

const CHUNK = 500;

export async function upsertArtists(db: AppDb, rows: Array<{ artistId: number; name: string }>) {
  for (const part of chunk(rows, CHUNK)) {
    if (part.length === 0) continue;
    await db.insert(schema.artists).values(part)
      .onConflictDoUpdate({ target: schema.artists.artistId, set: { name: sql`excluded.name` } });
  }
}

export async function upsertVenues(db: AppDb, rows: VenueRow[]) {
  for (const part of chunk(rows, CHUNK)) {
    if (part.length === 0) continue;
    await db.insert(schema.venues).values(part).onConflictDoUpdate({
      target: schema.venues.venueId,
      set: {
        name: sql`excluded.name`, slug: sql`excluded.slug`, city: sql`excluded.city`,
        state: sql`excluded.state`, country: sql`excluded.country`, zip: sql`excluded.zip`,
        capacity: sql`excluded.capacity`,
      },
    });
  }
}

export async function upsertTours(db: AppDb, rows: TourRow[]) {
  for (const part of chunk(rows, CHUNK)) {
    if (part.length === 0) continue;
    await db.insert(schema.tours).values(part).onConflictDoUpdate({
      target: schema.tours.tourId,
      set: { name: sql`excluded.name`, year: sql`excluded.year` },
    });
  }
}

export async function upsertSongs(db: AppDb, rows: SongRow[]) {
  for (const part of chunk(rows, CHUNK)) {
    if (part.length === 0) continue;
    await db.insert(schema.songs).values(part).onConflictDoUpdate({
      target: schema.songs.songId,
      set: {
        name: sql`excluded.name`, slug: sql`excluded.slug`,
        isOriginal: sql`excluded.is_original`, originalArtist: sql`excluded.original_artist`,
      },
    });
  }
}

export async function upsertShows(db: AppDb, rows: ShowRow[]) {
  for (const part of chunk(rows, CHUNK)) {
    if (part.length === 0) continue;
    await db.insert(schema.shows).values(part).onConflictDoUpdate({
      target: schema.shows.showId,
      set: {
        showDate: sql`excluded.show_date`, artistId: sql`excluded.artist_id`,
        venueId: sql`excluded.venue_id`, tourId: sql`excluded.tour_id`,
        title: sql`excluded.title`, permalink: sql`excluded.permalink`,
        showOrder: sql`excluded.show_order`, notes: sql`excluded.notes`,
        createdAt: sql`excluded.created_at`, updatedAt: sql`excluded.updated_at`,
      },
    });
  }
}

export async function upsertPerformances(db: AppDb, rows: PerformanceRow[]) {
  for (const part of chunk(rows, CHUNK)) {
    if (part.length === 0) continue;
    await db.insert(schema.performances).values(part).onConflictDoUpdate({
      target: schema.performances.uniqueId,
      set: {
        showId: sql`excluded.show_id`, songId: sql`excluded.song_id`,
        setType: sql`excluded.set_type`, setNumber: sql`excluded.set_number`,
        position: sql`excluded.position`, trackTime: sql`excluded.track_time`,
        transition: sql`excluded.transition`, transitionId: sql`excluded.transition_id`,
        isJamchart: sql`excluded.is_jamchart`, jamchartNotes: sql`excluded.jamchart_notes`,
        isReprise: sql`excluded.is_reprise`, isJam: sql`excluded.is_jam`,
        isVerified: sql`excluded.is_verified`, footnote: sql`excluded.footnote`,
      },
    });
  }
}

/**
 * Remove the Goose shows elgoose no longer lists, with their performances.
 *
 * Upserts never delete, so a show elgoose withdraws or merges (a cancelled date,
 * a duplicate listing) would otherwise stay on the site forever, and the nightly
 * source audit would stay red over it.
 *
 * Deleting is the dangerous half of a sync, so it refuses to act on a fetch that
 * looks wrong: an empty list, or one that would remove more than `maxRemove`
 * shows at once. Either throws, which fails the run loudly before anything is
 * deleted. A genuine mass withdrawal is a thing to look at by hand, not to apply.
 */
export async function pruneDroppedShows(
  db: AppDb,
  sourceShowIds: number[],
  opts: { artistId: number; maxRemove: number },
): Promise<{ removed: { showId: number; showDate: string }[] }> {
  if (sourceShowIds.length === 0) {
    throw new Error("prune: elgoose returned no shows; refusing to delete anything");
  }
  const keep = new Set(sourceShowIds);
  const held = await db
    .select({ showId: schema.shows.showId, showDate: schema.shows.showDate })
    .from(schema.shows)
    .where(eq(schema.shows.artistId, opts.artistId));
  const dropped = held.filter((s) => !keep.has(s.showId)).map((s) => ({ showId: s.showId, showDate: String(s.showDate) }));
  if (dropped.length === 0) return { removed: [] };
  if (dropped.length > opts.maxRemove) {
    const sample = dropped.slice(0, 5).map((s) => `${s.showId} (${s.showDate})`).join(", ");
    throw new Error(
      `prune: ${dropped.length} shows are gone from elgoose (more than ${opts.maxRemove}); refusing to delete them. e.g. ${sample}`,
    );
  }
  const ids = dropped.map((s) => s.showId);
  await db.transaction(async (tx) => {
    await tx.delete(schema.performances).where(inArray(schema.performances.showId, ids));
    await tx.delete(schema.shows).where(inArray(schema.shows.showId, ids));
  });
  return { removed: dropped };
}

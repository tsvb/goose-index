import { sql } from "drizzle-orm";
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

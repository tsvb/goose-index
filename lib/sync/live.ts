import { and, inArray, notInArray } from "drizzle-orm";
import type { AppDb } from "../../db/schema";
import * as schema from "../../db/schema";
import type {
  ElgooseClient, RawShow, RawSetlistRow, TourRow, VenueRow, ShowRow, PerformanceRow,
} from "../elgoose/types";
import { mapShow, mapTour, mapSongFromSetlist, mapPerformance } from "../elgoose/mappers";
import {
  upsertArtists, upsertVenues, upsertTours, upsertSongs, upsertShows, upsertPerformances,
} from "../../db/repository";
import { ensureSongSlugs } from "../../db/slugs";
import { decodeEntities } from "../util";

const GOOSE = 1;

/** The by-date shows endpoint also carries venue naming the bare list omits. */
type RawShowDated = RawShow & { venuename?: string; city?: string; state?: string; country?: string };

export interface LiveSyncSummary {
  shows: number;
  performances: number;
  deleted: number;
}

/**
 * Incremental one-date sync for live shows: pulls just this date's show and
 * setlist rows from elgoose and folds them into the same tables the nightly
 * sync owns. Two rules keep it safe to run every minute while a show happens:
 *
 * - Songs and venues are INSERT-ONLY here — live setlist rows carry sparser,
 *   sometimes hand-typed catalog data, and blind upserts would clobber what
 *   the nightly sync maintains. New songs still appear instantly (debuts!).
 * - Performances are upserted by uniqueid, and rows that disappeared upstream
 *   (live corrections) are deleted — but only when the fetch returned rows,
 *   so an upstream glitch or empty response can never wipe a setlist.
 */
export async function runLiveSync(deps: { client: ElgooseClient; db: AppDb; date: string }): Promise<LiveSyncSummary> {
  const { client, db, date } = deps;

  const rawShows = (await client.fetchMethod<RawShowDated>(`shows/showdate/${date}`))
    .filter((s) => s.artist_id === GOOSE);
  if (rawShows.length === 0) return { shows: 0, performances: 0, deleted: 0 };

  // The shows and setlists endpoints are fetched separately and elgoose edits
  // both by hand during a show, so a row can arrive for a show the shows fetch
  // didn't return yet (a same-night show added between the two calls). Writing
  // its performance would violate the performances→shows FK and roll back the
  // whole pull. Keep only rows for shows we actually have; the orphans land on
  // a later pull once the shows fetch includes them.
  const knownShowIds = new Set(rawShows.map((s) => s.show_id));
  const rawSetlist = (await client.fetchMethod<RawSetlistRow>(`setlists/showdate/${date}`))
    .filter((r) => r.artist_id === GOOSE && knownShowIds.has(r.show_id));

  // Show notes: first setlist row that has them (same rule as the full sync).
  const notesByShow = new Map<number, string | null>();
  for (const r of rawSetlist) {
    if (!notesByShow.has(r.show_id) && r.shownotes && r.shownotes.trim() !== "") {
      notesByShow.set(r.show_id, r.shownotes);
    }
  }

  // Tours referenced by tonight's rows — only the named ones can be inserted
  // (blank tourname would violate tours.name NOT NULL).
  const toursById = new Map<number, TourRow>();
  for (const r of [...rawShows, ...rawSetlist]) {
    if (r.tour_id > 0 && r.tourname && r.tourname.trim() !== "" && !toursById.has(r.tour_id)) {
      toursById.set(r.tour_id, mapTour(r));
    }
  }

  // A show may reference a tour_id that arrives unnamed (elgoose creates the
  // tour before naming it). We can't insert an unnamed tour, so such a show
  // would dangle its tour FK. Resolve to tours that will exist after this pull
  // — already in the DB, or named in tonight's payload — and null out the rest
  // on the show row (the nightly sync backfills the name and re-links it).
  const referencedTourIds = [...new Set(rawShows.map((s) => s.tour_id).filter((t) => t > 0))];
  const knownTours = referencedTourIds.length
    ? new Set((await db.select({ id: schema.tours.tourId }).from(schema.tours)
        .where(inArray(schema.tours.tourId, referencedTourIds))).map((r) => r.id))
    : new Set<number>();
  const resolvableTours = new Set<number>([...knownTours, ...toursById.keys()]);

  // Venues: insert only the ones we don't have (never update — the by-date
  // payloads lack zip/capacity and would null them out).
  const venueIds = [...new Set(rawShows.map((s) => s.venue_id).filter((v) => v > 0))];
  const knownVenues = venueIds.length
    ? new Set((await db.select({ id: schema.venues.venueId }).from(schema.venues)
        .where(inArray(schema.venues.venueId, venueIds))).map((r) => r.id))
    : new Set<number>();
  // Dedup by venue_id — two same-date shows at one new venue (a festival day)
  // would otherwise put the same id in the batch twice, and a single
  // INSERT..ON CONFLICT can't touch the same conflict row twice (it throws).
  const newVenuesById = new Map<number, VenueRow>();
  for (const s of rawShows) {
    if (s.venue_id > 0 && !knownVenues.has(s.venue_id) && !newVenuesById.has(s.venue_id)) {
      newVenuesById.set(s.venue_id, {
        venueId: s.venue_id,
        name: decodeEntities(s.venuename ?? rawSetlist.find((r) => r.venue_id === s.venue_id)?.venuename ?? `Venue ${s.venue_id}`),
        slug: null,
        city: s.city ?? null,
        state: s.state ?? null,
        country: s.country ?? null,
        zip: null,
        capacity: null,
      });
    }
  }
  const newVenues = [...newVenuesById.values()];

  // Songs: insert only the missing ones (a live debut shows up instantly);
  // existing catalog rows are left untouched.
  const songIds = [...new Set(rawSetlist.map((r) => r.song_id))];
  const knownSongs = songIds.length
    ? new Set((await db.select({ id: schema.songs.songId }).from(schema.songs)
        .where(inArray(schema.songs.songId, songIds))).map((r) => r.id))
    : new Set<number>();
  const newSongsById = new Map(
    rawSetlist.filter((r) => !knownSongs.has(r.song_id)).map((r) => [r.song_id, mapSongFromSetlist(r)]),
  );

  const shows: ShowRow[] = rawShows.map((s) => {
    const row = mapShow(s, notesByShow.get(s.show_id) ?? null);
    if (row.tourId != null && !resolvableTours.has(row.tourId)) row.tourId = null;
    return row;
  });
  // Dedup by uniqueid (last wins) — a live hand-edit can momentarily emit the
  // same uniqueid twice, which would likewise break the single ON CONFLICT.
  const performancesById = new Map<string, PerformanceRow>();
  for (const r of rawSetlist) {
    const p = mapPerformance(r);
    performancesById.set(p.uniqueId, p);
  }
  const performances = [...performancesById.values()];

  // FK-safe write order (mirrors the full sync).
  await upsertArtists(db, [{ artistId: GOOSE, name: "Goose" }]);
  await upsertVenues(db, newVenues);
  await upsertTours(db, [...toursById.values()]);
  await upsertSongs(db, [...newSongsById.values()]);
  if (newSongsById.size > 0) await ensureSongSlugs(db);
  await upsertShows(db, shows);
  await upsertPerformances(db, performances);

  // Upstream corrections: within each show that returned rows THIS pull, drop
  // local rows elgoose no longer lists. Scoped to shows actually present in
  // this setlist fetch — never to a sibling show whose rows were merely absent
  // from this pull (that would wipe its whole setlist on a two-show night).
  // The per-show scope also subsumes the empty-fetch guard.
  let deleted = 0;
  const showIdsWithRows = [...new Set(performances.map((p) => p.showId))];
  if (showIdsWithRows.length > 0) {
    const keep = performances.map((p) => p.uniqueId);
    const gone = await db.delete(schema.performances)
      .where(and(
        inArray(schema.performances.showId, showIdsWithRows),
        notInArray(schema.performances.uniqueId, keep),
      ))
      .returning({ uniqueId: schema.performances.uniqueId });
    deleted = gone.length;
  }

  return { shows: shows.length, performances: performances.length, deleted };
}

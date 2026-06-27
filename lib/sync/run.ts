import type { AppDb } from "../../db/schema";
import type {
  ElgooseClient, RawSong, RawVenue, RawShow, RawSetlistRow, TourRow, ShowRow,
} from "../elgoose/types";
import { mapSong, mapVenue, mapShow, mapTour, mapPerformance } from "../elgoose/mappers";
import {
  upsertArtists, upsertVenues, upsertTours, upsertSongs, upsertShows, upsertPerformances,
} from "../../db/repository";

export interface SyncSummary {
  venues: number; tours: number; songs: number; shows: number; performances: number;
}

const GOOSE = 1;

export async function runSync(deps: { client: ElgooseClient; db: AppDb }): Promise<SyncSummary> {
  const { client, db } = deps;

  const rawSongs = await client.fetchMethod<RawSong>("songs");
  const rawVenues = await client.fetchMethod<RawVenue>("venues");
  const rawShows = (await client.fetchMethod<RawShow>("shows")).filter((s) => s.artist_id === GOOSE);
  const rawSetlists = (await client.fetchMethod<RawSetlistRow>("setlists")).filter((r) => r.artist_id === GOOSE);

  // Derive show notes from the first setlist row that has shownotes.
  const notesByShow = new Map<number, string | null>();
  for (const r of rawSetlists) {
    if (!notesByShow.has(r.show_id) && r.shownotes && r.shownotes.trim() !== "") {
      notesByShow.set(r.show_id, r.shownotes);
    }
  }

  // Derive tours from shows + setlists (only real tours: id > 0 and a name).
  const toursById = new Map<number, TourRow>();
  const collectTour = (tour_id: number, tourname: string, year?: number) => {
    if (tour_id > 0 && tourname && tourname.trim() !== "" && !toursById.has(tour_id)) {
      toursById.set(tour_id, mapTour({ tour_id, tourname, show_year: year }));
    }
  };
  for (const s of rawShows) collectTour(s.tour_id, s.tourname, s.show_year);
  for (const r of rawSetlists) collectTour(r.tour_id, r.tourname, r.show_year ?? r.showyear);

  const venues = rawVenues.map(mapVenue);
  const songs = rawSongs.map(mapSong);
  const tours = [...toursById.values()];
  const shows: ShowRow[] = rawShows.map((s) => mapShow(s, notesByShow.get(s.show_id) ?? null));
  const performances = rawSetlists.map(mapPerformance);

  // FK-safe write order.
  await upsertArtists(db, [{ artistId: GOOSE, name: "Goose" }]);
  await upsertVenues(db, venues);
  await upsertTours(db, tours);
  await upsertSongs(db, songs);
  await upsertShows(db, shows);
  await upsertPerformances(db, performances);

  return {
    venues: venues.length, tours: tours.length, songs: songs.length,
    shows: shows.length, performances: performances.length,
  };
}

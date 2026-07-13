import { pgTable, integer, text, boolean, date, index, timestamp, primaryKey } from "drizzle-orm/pg-core";
import type { PgDatabase } from "drizzle-orm/pg-core";

export const artists = pgTable("artists", {
  artistId: integer("artist_id").primaryKey(),
  name: text("name").notNull(),
});

export const venues = pgTable("venues", {
  venueId: integer("venue_id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  zip: text("zip"),
  capacity: integer("capacity"),
});

export const tours = pgTable("tours", {
  tourId: integer("tour_id").primaryKey(),
  name: text("name").notNull(),
  year: integer("year"),
});

export const songs = pgTable("songs", {
  songId: integer("song_id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug"),
  isOriginal: boolean("is_original").notNull().default(false),
  originalArtist: text("original_artist"),
});

export const shows = pgTable("shows", {
  showId: integer("show_id").primaryKey(),
  showDate: date("show_date").notNull(),
  artistId: integer("artist_id").notNull().references(() => artists.artistId),
  venueId: integer("venue_id").references(() => venues.venueId),
  tourId: integer("tour_id").references(() => tours.tourId),
  title: text("title"),
  permalink: text("permalink"),
  showOrder: integer("show_order"),
  notes: text("notes"),
  bandcampAlbumId: text("bandcamp_album_id"),
  bandcampUrl: text("bandcamp_url"),
  coachNotes: text("coach_notes"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
}, (t) => ({
  dateIdx: index("shows_date_idx").on(t.showDate),
  venueIdx: index("shows_venue_idx").on(t.venueId),
  tourIdx: index("shows_tour_idx").on(t.tourId),
}));

export const performances = pgTable("performances", {
  uniqueId: text("unique_id").primaryKey(),
  showId: integer("show_id").notNull().references(() => shows.showId),
  songId: integer("song_id").notNull().references(() => songs.songId),
  setType: text("set_type"),
  setNumber: text("set_number"),
  position: integer("position"),
  trackTime: text("track_time"),
  transition: text("transition"),
  transitionId: integer("transition_id"),
  isJamchart: boolean("is_jamchart").notNull().default(false),
  jamchartNotes: text("jamchart_notes"),
  isReprise: boolean("is_reprise").notNull().default(false),
  isJam: boolean("is_jam").notNull().default(false),
  isVerified: boolean("is_verified").notNull().default(false),
  footnote: text("footnote"),
}, (t) => ({
  showIdx: index("perf_show_idx").on(t.showId),
  songIdx: index("perf_song_idx").on(t.songId),
}));

// The discography, from the band's Bandcamp. elgoose is a setlist database and
// knows nothing about releases, so "which album is this song on?" can only be
// answered from here.
//
// `kind` separates the two things Bandcamp lumps together: 'studio' is the
// discography proper (LPs, EPs, singles, Ted Tapes, Chateau Sessions) and 'live'
// is an official live album (Live at MSG, Radio City…). The ~460 dated
// show-tape releases aren't albums at all and aren't imported. Live albums are
// stored but not used by the album sort — a song being on a live tape doesn't
// answer "which album is it on", and including them would put nearly every song
// on an "album".
export const albums = pgTable("albums", {
  albumId: text("album_id").primaryKey(), // bandcamp's id
  title: text("title").notNull(),
  slug: text("slug"),
  releaseDate: date("release_date"),
  numTracks: integer("num_tracks").notNull().default(0),
  url: text("url"),
  kind: text("kind").notNull().default("studio"),
});

// A track is a position on a release. `song_id` is null when the track can't be
// matched to a song in the catalog — an interlude, an intro, a title elgoose
// spells differently — and a null is kept rather than dropped so the tracklist
// stays a faithful record of the release.
export const albumTracks = pgTable("album_tracks", {
  albumId: text("album_id").notNull().references(() => albums.albumId),
  trackNum: integer("track_num").notNull(),
  title: text("title").notNull(),
  songId: integer("song_id").references(() => songs.songId),
  durationSec: integer("duration_sec"),
}, (t) => ({
  pk: primaryKey({ columns: [t.albumId, t.trackNum] }),
  songIdx: index("album_tracks_song_idx").on(t.songId),
}));

// Single-row coordination state for the live-show incremental sync: the
// atomic 60s claim on last_run_at is what stops concurrent page renders
// from stampeding elgoose during a show.
export const liveSyncState = pgTable("live_sync_state", {
  id: integer("id").primaryKey(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  lastDate: text("last_date"),
  lastSummary: text("last_summary"),
});

export type AppDb = PgDatabase<any, Record<string, never>, any>;

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

// ---- Identity (site-level: the forum uses it now; Phase 4 fan-tracking will too) ----

export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull(),               // display case
  usernameLower: text("username_lower").notNull().unique(),
  emailLower: text("email_lower").notNull().unique(), // the only PII we hold
  role: text("role").notNull().default("member"),     // member | admin
  signature: text("signature"),
  postCount: integer("post_count").notNull().default(0), // denormalized; verified by lib/verify
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  markAllReadAt: timestamp("mark_all_read_at", { withTimezone: true }),
  bannedAt: timestamp("banned_at", { withTimezone: true }),
  bannedReason: text("banned_reason"),
});

// Stored hashed (sha256 of the cookie token) — a DB leak exposes no usable session.
export const sessions = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
}, (t) => ({ userIdx: index("sessions_user_idx").on(t.userId) }));

// Magic-link tokens, also stored hashed; single-use, 15-minute expiry.
export const loginTokens = pgTable("login_tokens", {
  tokenHash: text("token_hash").primaryKey(),
  purpose: text("purpose").notNull(),      // signup | login | email-change
  emailLower: text("email_lower").notNull(),
  username: text("username"),              // signup: the requested display username
  userId: integer("user_id").references(() => users.id), // login / email-change
  ip: text("ip"),                          // for issuance rate limits (enforced in Phase D)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
}, (t) => ({ emailIdx: index("login_tokens_email_idx").on(t.emailLower) }));

// ---- Forum ----

export const forumCategories = pgTable("forum_categories", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  position: integer("position").notNull(),
});

export const forumBoards = pgTable("forum_boards", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  categoryId: integer("category_id").notNull().references(() => forumCategories.id),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  position: integer("position").notNull(),
  threadCount: integer("thread_count").notNull().default(0), // denormalized; verified by lib/verify
  postCount: integer("post_count").notNull().default(0),
  lastPostId: integer("last_post_id"),
});

export const forumThreads = pgTable("forum_threads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  boardId: integer("board_id").notNull().references(() => forumBoards.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  locked: boolean("locked").notNull().default(false),
  replyCount: integer("reply_count").notNull().default(0), // posts - 1 (tombstones included)
  lastPostId: integer("last_post_id"),
  lastPostAt: timestamp("last_post_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  boardIdx: index("forum_threads_board_idx").on(t.boardId, t.pinned, t.lastPostAt),
}));

export const forumPosts = pgTable("forum_posts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  threadId: integer("thread_id").notNull().references(() => forumThreads.id),
  authorId: integer("author_id").notNull().references(() => users.id),
  body: text("body").notNull(),               // raw BBCode source, ≤ BODY_MAX
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  editedAt: timestamp("edited_at", { withTimezone: true }),
  editedById: integer("edited_by_id").references(() => users.id),
  deletedAt: timestamp("deleted_at", { withTimezone: true }), // soft delete → tombstone
  deletedById: integer("deleted_by_id").references(() => users.id),
}, (t) => ({
  threadIdx: index("forum_posts_thread_idx").on(t.threadId, t.id),
  authorIdx: index("forum_posts_author_idx").on(t.authorId, t.id),
}));

// One reaction per member per post (XenForo-style) — same kind toggles off,
// a different kind replaces it. See lib/forum/mutations.ts#toggleReaction.
export const forumReactions = pgTable("forum_reactions", {
  postId: integer("post_id").notNull().references(() => forumPosts.id),
  userId: integer("user_id").notNull().references(() => users.id),
  kind: text("kind").notNull(), // like | honk
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.postId, t.userId] }),
}));

export type AppDb = PgDatabase<any, Record<string, never>, any>;

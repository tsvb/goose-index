import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { upsertArtists, upsertVenues, upsertSongs, upsertShows, upsertPerformances } from "@/db/repository";

// Redirect the module-level `db` in discoveries.ts to the PGlite test db.
let _testDb: Awaited<ReturnType<typeof makeTestDb>>["db"] | null = null;
vi.mock("@/db/client", () => ({
  db: new Proxy({} as Record<string | symbol, unknown>, {
    get(_t, prop) {
      if (!_testDb) throw new Error("Test db not initialised");
      const real = _testDb as unknown as Record<string | symbol, unknown>;
      const val = real[prop];
      return typeof val === "function" ? val.bind(real) : val;
    },
  }),
}));

const ctx = await makeTestDb();
_testDb = ctx.db;
afterAll(() => ctx.close());

const { dayOfWeekJams } = await import("@/lib/queries/discoveries");

/** All three shows sit on a Monday, so one weekday carries the whole fixture. */
const MONDAY = { played: "2020-01-06", alsoPlayed: "2020-01-13", noSetlist: "2020-01-20" };

function perf(
  uniqueId: string, showId: number, songId: number, position: number,
  opts: { isJamchart?: boolean } = {},
) {
  return {
    uniqueId, showId, songId, setType: "Set", setNumber: "1", position, trackTime: null,
    transition: null, transitionId: null, isJamchart: opts.isJamchart ?? false,
    jamchartNotes: null, isReprise: false, isJam: false, isVerified: true, footnote: null,
  };
}

beforeAll(async () => {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [
    { venueId: 1, name: "The Cap", slug: "cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 },
  ]);
  await upsertSongs(ctx.db, [
    { songId: 900, name: "Arcadia", slug: "arcadia", isOriginal: true, originalArtist: null },
    { songId: 901, name: "Hot Tea", slug: "hot-tea", isOriginal: true, originalArtist: null },
  ]);

  await upsertShows(ctx.db, [
    // Two shows we have setlists for: one jam between them.
    { showId: 1, showDate: MONDAY.played, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p1", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    { showId: 2, showDate: MONDAY.alsoPlayed, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p2", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    // A show row with no setlist at all — elgoose knows the date, not the music.
    { showId: 3, showDate: MONDAY.noSetlist, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p3", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
  ]);

  await upsertPerformances(ctx.db, [
    perf("u-1-1", 1, 900, 1, { isJamchart: true }),
    perf("u-1-2", 1, 901, 2),
    perf("u-2-1", 2, 900, 1),
    perf("u-2-2", 2, 901, 2),
  ]);
});

describe("dayOfWeekJams: a show with no setlist is not a show with no jams", () => {
  it("counts only shows we have a setlist for", async () => {
    const monday = (await dayOfWeekJams()).find((r) => r.dayName === "Monday");
    // Three Monday rows exist; only two have any music logged against them.
    expect(monday?.totalShows).toBe(2);
  });

  it("averages jams over played shows, so an unlogged date can't dilute the reading", async () => {
    const monday = (await dayOfWeekJams()).find((r) => r.dayName === "Monday");
    // One jam across two played shows. Counting the setlist-less show would
    // report 0.333 — a quieter Monday than the data actually shows.
    expect(monday?.avgJams).toBeCloseTo(0.5, 5);
  });
});

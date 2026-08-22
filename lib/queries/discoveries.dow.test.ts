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

/** All four shows sit on a Monday, so one weekday carries the whole fixture. */
const MONDAY = {
  played: "2020-01-06",
  alsoPlayed: "2020-01-13",
  noSetlist: "2020-01-20",
  /** Played after the newest filed chart — its silence isn't a measurement. */
  uncharted: "2020-01-27",
};

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
    // Two charted shows, one jam between them: show 2 carries the newest chart.
    { showId: 1, showDate: MONDAY.played, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p1", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    { showId: 2, showDate: MONDAY.alsoPlayed, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p2", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    // A show row with no setlist at all — elgoose knows the date, not the music.
    { showId: 3, showDate: MONDAY.noSetlist, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p3", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    // Played, logged, and newer than any filed chart: nobody has read it yet.
    { showId: 4, showDate: MONDAY.uncharted, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p4", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
  ]);

  await upsertPerformances(ctx.db, [
    perf("u-1-1", 1, 900, 1),
    perf("u-1-2", 1, 901, 2),
    // The newest filed chart sits here, so this show is the frontier.
    perf("u-2-1", 2, 900, 1, { isJamchart: true }),
    perf("u-2-2", 2, 901, 2),
    perf("u-4-1", 4, 900, 1),
    perf("u-4-2", 4, 901, 2),
  ]);
});

describe("dayOfWeekJams: a show with no setlist is not a show with no jams", () => {
  it("counts only shows we have a setlist for", async () => {
    const monday = (await dayOfWeekJams()).find((r) => r.dayName === "Monday");
    // Four Monday rows exist; only two are both logged and charted.
    expect(monday?.totalShows).toBe(2);
  });

  it("averages jams over played shows, so an unlogged date can't dilute the reading", async () => {
    const monday = (await dayOfWeekJams()).find((r) => r.dayName === "Monday");
    // One jam across two charted shows. Counting the setlist-less show would
    // report 0.333 — a quieter Monday than the data actually shows.
    expect(monday?.avgJams).toBeCloseTo(0.5, 5);
  });

  it("stops at the newest filed chart, so an unread show is not a scoreless one", async () => {
    const monday = (await dayOfWeekJams()).find((r) => r.dayName === "Monday");
    // Show 4 is played and logged but sits past the frontier. Counting it drops
    // Monday to 0.333 on the strength of a chart nobody has written.
    expect(monday?.totalShows).toBe(2);
    expect(monday?.avgJams).toBeCloseTo(0.5, 5);
  });
});

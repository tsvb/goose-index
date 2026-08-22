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

/**
 * Every date here is a Monday, so one weekday carries the whole fixture.
 *
 * The order matters. `noSetlist` sits *inside* the charted window, ahead of the
 * frontier — put it after, and the frontier bound cuts it first, the
 * setlist-less guard never runs, and its test passes for the wrong reason.
 */
const MONDAY = {
  /** Played and logged, no chart filed against it. */
  played: "2020-01-06",
  /** A date elgoose knows about with no music logged: only the setlist guard catches it. */
  noSetlist: "2020-01-13",
  /** Carries the newest chart, so this show *is* the frontier. */
  charted: "2020-01-20",
  /** Played and logged, but past the frontier — nobody has read it yet. */
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

const showRow = (showId: number, showDate: string) => ({
  showId, showDate, artistId: 1, venueId: 1, tourId: null, title: null,
  permalink: `p${showId}`, showOrder: 1, notes: null, createdAt: null, updatedAt: null,
});

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
    showRow(1, MONDAY.played),
    showRow(2, MONDAY.charted),
    showRow(3, MONDAY.noSetlist),
    showRow(4, MONDAY.uncharted),
  ]);

  await upsertPerformances(ctx.db, [
    perf("u-1-1", 1, 900, 1),
    perf("u-1-2", 1, 901, 2),
    // The newest filed chart sits here, which makes show 2 the frontier.
    perf("u-2-1", 2, 900, 1, { isJamchart: true }),
    perf("u-2-2", 2, 901, 2),
    // Show 3 gets no performances at all — that is the whole point of it.
    perf("u-4-1", 4, 900, 1),
    perf("u-4-2", 4, 901, 2),
  ]);
});

describe("dayOfWeekJams: an absence is only a zero where it was measured", () => {
  it("counts only shows we have a setlist for", async () => {
    const monday = (await dayOfWeekJams()).find((r) => r.dayName === "Monday");
    // Four Monday rows. Show 3 is inside the charted window but has no music
    // logged against it, so the setlist guard is the only thing that can drop
    // it — and it must.
    expect(monday?.totalShows).toBe(2);
  });

  it("averages jams over played shows, so an unlogged date can't dilute the reading", async () => {
    const monday = (await dayOfWeekJams()).find((r) => r.dayName === "Monday");
    // One jam across the two counted shows. Letting show 3 in reports 0.333 —
    // a quieter Monday than anything anyone actually watched.
    expect(monday?.avgJams).toBeCloseTo(0.5, 5);
  });

  it("stops at the newest filed chart, so an unread show is not a scoreless one", async () => {
    const monday = (await dayOfWeekJams()).find((r) => r.dayName === "Monday");
    // Show 4 is played and logged but past the frontier. Counting it scores a
    // night against a chart nobody has written.
    expect(monday?.totalShows).toBe(2);
    expect(monday?.avgJams).toBeCloseTo(0.5, 5);
  });
});

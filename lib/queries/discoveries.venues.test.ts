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

const { deepestVenues, DEEPEST_MIN_SHOWS } = await import("@/lib/queries/discoveries");

/**
 * Every night is two songs, one of them charted where a chart exists — so a
 * fully-read room sits at 50%.
 *
 *   The Cap  — three nights, all read. Sets the frontier with its last one.
 *   The Barn — three nights read plus a fourth played after the frontier.
 *              Stays above the minimum, so its ratio is readable: the test of
 *              whether an unread night dilutes it.
 *   The Shed — two nights read plus one past the frontier. The test of whether
 *              an unread night can pad a room up to the minimum.
 */
const CAP = ["2020-01-06", "2020-02-06", "2020-03-06"];
const BARN_READ = ["2020-01-07", "2020-02-07", "2020-03-05"];
const BARN_UNREAD = "2020-04-07";
const SHED_READ = ["2020-01-08", "2020-02-08"];
const SHED_UNREAD = "2020-04-08";

function perf(uniqueId: string, showId: number, songId: number, position: number, isJamchart = false) {
  return {
    uniqueId, showId, songId, setType: "Set", setNumber: "1", position, trackTime: null,
    transition: null, transitionId: null, isJamchart,
    jamchartNotes: null, isReprise: false, isJam: false, isVerified: true, footnote: null,
  };
}

const showRow = (showId: number, showDate: string, venueId: number) => ({
  showId, showDate, artistId: 1, venueId, tourId: null, title: null,
  permalink: `p${showId}`, showOrder: 1, notes: null, createdAt: null, updatedAt: null,
});

/** A night: two songs, the first charted only where the room has been read. */
const night = (showId: number, charted: boolean) => [
  perf(`u-${showId}-1`, showId, 900, 1, charted),
  perf(`u-${showId}-2`, showId, 901, 2),
];

beforeAll(async () => {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [
    { venueId: 1, name: "The Cap", slug: "cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 },
    { venueId: 2, name: "The Barn", slug: "barn", city: "Norwalk", state: "CT", country: "USA", zip: null, capacity: 400 },
    { venueId: 3, name: "The Shed", slug: "shed", city: "Bridgeport", state: "CT", country: "USA", zip: null, capacity: 300 },
  ]);
  await upsertSongs(ctx.db, [
    { songId: 900, name: "Arcadia", slug: "arcadia", isOriginal: true, originalArtist: null },
    { songId: 901, name: "Hot Tea", slug: "hot-tea", isOriginal: true, originalArtist: null },
  ]);

  const shows = [
    ...CAP.map((d, i) => ({ row: showRow(1 + i, d, 1), charted: true })),
    ...BARN_READ.map((d, i) => ({ row: showRow(11 + i, d, 2), charted: true })),
    { row: showRow(19, BARN_UNREAD, 2), charted: false },
    ...SHED_READ.map((d, i) => ({ row: showRow(21 + i, d, 3), charted: true })),
    { row: showRow(29, SHED_UNREAD, 3), charted: false },
  ];

  await upsertShows(ctx.db, shows.map((s) => s.row));
  await upsertPerformances(ctx.db, shows.flatMap((s) => night(s.row.showId, s.charted)));
});

describe("deepestVenues: an unread night doesn't count against a room", () => {
  it("measures the jam share over read shows only", async () => {
    const barn = (await deepestVenues()).find((v) => v.name === "The Barn");
    // Three read nights, two songs each, one jam apiece: 3 of 6 = 50%. Counting
    // the unread fourth reports 3 of 8 = 37.5% — a shallower room on the
    // strength of a chart nobody has written.
    expect(barn?.totalShows).toBe(3);
    expect(barn?.totalPerformances).toBe(6);
    expect(barn?.jamPercentage).toBeCloseTo(50, 5);
  });

  it("holds the unread night against the minimum too, so a thin sample can't pass as a full one", async () => {
    const rooms = (await deepestVenues()).map((v) => v.name);
    // The Shed has DEEPEST_MIN_SHOWS nights played but only two read. The
    // minimum is there to demand a real sample, and an unread night isn't one,
    // so the room waits for the charts rather than ranking on two.
    expect(DEEPEST_MIN_SHOWS).toBe(3);
    expect(rooms).toContain("The Cap");
    expect(rooms).toContain("The Barn");
    expect(rooms).not.toContain("The Shed");
  });
});

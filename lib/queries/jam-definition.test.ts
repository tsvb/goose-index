import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { upsertArtists, upsertVenues, upsertSongs, upsertShows, upsertPerformances } from "@/db/repository";

// Redirect the module-level `db` in the query modules to the PGlite test db.
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

const { dayOfWeekJams, deepestVenues } = await import("@/lib/queries/discoveries");
const { getSongBySlug } = await import("@/lib/queries/songs");
const { jamChartFrontier } = await import("@/lib/queries/jam-charts");

/**
 * One definition of "jam", pinned: `is_jamchart`, never `is_jam`.
 *
 * The site used to read `is_jam or is_jamchart` in the three aggregates and
 * `is_jamchart` alone everywhere a star is drawn — so the number you counted
 * and the marker you saw came from different rules. They agreed only because
 * `is_jam` is 0 on all 9,595 setlist rows elgoose serves, for every artist.
 *
 * This fixture flags a performance the way elgoose never does, which is the
 * only way to tell the two rules apart. Every figure here must ignore it.
 */
const CHART_ONLY = "2020-01-13";  // carries the chart entry: the one real jam
const JAM_ONLY = "2020-01-06";    // is_jam set, no chart entry: must count for nothing
const NEITHER = "2019-12-30";     // plain night, present to clear DEEPEST_MIN_SHOWS

function perf(
  uniqueId: string, showId: number, songId: number, position: number,
  opts: { isJam?: boolean; isJamchart?: boolean } = {},
) {
  return {
    uniqueId, showId, songId, setType: "Set", setNumber: "1", position, trackTime: null,
    transition: null, transitionId: null,
    isJamchart: opts.isJamchart ?? false, jamchartNotes: null,
    isReprise: false, isJam: opts.isJam ?? false, isVerified: true, footnote: null,
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

  await upsertShows(ctx.db, [showRow(1, JAM_ONLY), showRow(2, NEITHER), showRow(3, CHART_ONLY)]);

  await upsertPerformances(ctx.db, [
    // is_jam without a chart entry — the flag the site must not read.
    perf("u-1-1", 1, 900, 1, { isJam: true }),
    perf("u-1-2", 1, 901, 2),
    perf("u-2-1", 2, 900, 1),
    perf("u-2-2", 2, 901, 2),
    // The one real jam, and the newest chart, so the window covers all three.
    perf("u-3-1", 3, 900, 1, { isJamchart: true }),
    perf("u-3-2", 3, 901, 2),
  ]);
});

describe("a jam is is_jamchart, everywhere", () => {
  it("the weekday dial counts chart entries only", async () => {
    const monday = (await dayOfWeekJams()).find((r) => r.dayName === "Monday");
    // All three nights are Mondays inside the window. One chart entry across
    // them: 1/3. Reading is_jam too would count two and report 0.667.
    expect(monday?.totalShows).toBe(3);
    expect(monday?.avgJams).toBeCloseTo(1 / 3, 5);
  });

  it("venue depth counts chart entries only", async () => {
    const cap = (await deepestVenues()).find((v) => v.name === "The Cap");
    // Six performances at the room, one of them charted: 16.7%. Reading is_jam
    // too would report 33.3% — a room twice as deep as the charts say.
    expect(cap?.totalPerformances).toBe(6);
    expect(cap?.totalJams).toBe(1);
    expect(cap?.jamPercentage).toBeCloseTo(16.7, 1);
  });

  it("a song's jammed share counts chart entries only", async () => {
    // Arcadia is played all three nights: one is_jam-only, one plain, one
    // charted. One in three is a jam — 33%. Reading is_jam too reports 67%,
    // and the bar would disagree with the star drawn beside the same
    // performance in the table above it.
    const song = await getSongBySlug("arcadia");
    expect(song?.timesPlayed).toBe(3);
    expect(song?.setPlacement.jammed).toBe(33);
  });

  it("the frontier moves on chart entries only", async () => {
    // Needs its own corpus: here the is_jam night is the NEWEST, so a frontier
    // that counted is_jam would land on it. Against the shared fixture above
    // this assertion could not fail — JAM_ONLY is the older date, so max()
    // returns CHART_ONLY under either rule.
    const iso = await makeTestDb();
    try {
      await upsertArtists(iso.db, [{ artistId: 1, name: "Goose" }]);
      await upsertVenues(iso.db, [
        { venueId: 1, name: "The Cap", slug: "cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 },
      ]);
      await upsertSongs(iso.db, [
        { songId: 900, name: "Arcadia", slug: "arcadia", isOriginal: true, originalArtist: null },
      ]);
      await upsertShows(iso.db, [showRow(1, "2020-01-06"), showRow(2, "2020-02-17")]);
      await upsertPerformances(iso.db, [
        perf("i-1", 1, 900, 1, { isJamchart: true }),   // older: the real frontier
        perf("i-2", 2, 900, 1, { isJam: true }),        // newer: must not move it
      ]);

      _testDb = iso.db;
      expect(await jamChartFrontier()).toBe("2020-01-06");
    } finally {
      _testDb = ctx.db;
      await iso.close();
    }
  });
});

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { upsertArtists, upsertVenues, upsertSongs, upsertShows, upsertPerformances } from "@/db/repository";

// Redirect the module-level `db` in jam-charts.ts to the PGlite test db.
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

const { jamChartFrontier, awaitingJamCharts } = await import("@/lib/queries/jam-charts");

const ANNOTATED = "2020-02-01";
const LATER = "2020-03-01";
const OLD_UNANNOTATED = "2019-01-01";

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
  ]);

  await upsertShows(ctx.db, [
    // Older than the frontier, never annotated — a documented night with no jams.
    { showId: 1, showDate: OLD_UNANNOTATED, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p1", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    // The newest show carrying a jam-chart entry: the frontier itself.
    { showId: 2, showDate: ANNOTATED, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p2", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    // Played after the frontier, nothing filed against it yet.
    { showId: 3, showDate: LATER, artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p3", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
  ]);

  await upsertPerformances(ctx.db, [
    perf("u-1", 1, 900, 1),
    perf("u-2", 2, 900, 1, { isJamchart: true }),
    perf("u-3", 3, 900, 1),
  ]);
});

describe("jamChartFrontier", () => {
  it("is the newest show carrying any jam-chart entry", async () => {
    expect(await jamChartFrontier()).toBe(ANNOTATED);
  });
});

describe("awaitingJamCharts", () => {
  it("is true for a show played after the frontier with nothing filed against it", () => {
    expect(awaitingJamCharts({ date: LATER, frontier: ANNOTATED, hasEntries: false })).toBe(true);
  });

  it("is false once that show has an entry of its own", () => {
    expect(awaitingJamCharts({ date: LATER, frontier: ANNOTATED, hasEntries: true })).toBe(false);
  });

  it("is false for an older unannotated show — absence there is settled, not pending", () => {
    expect(awaitingJamCharts({ date: OLD_UNANNOTATED, frontier: ANNOTATED, hasEntries: false })).toBe(false);
  });

  it("is false for the frontier show itself", () => {
    expect(awaitingJamCharts({ date: ANNOTATED, frontier: ANNOTATED, hasEntries: true })).toBe(false);
  });

  it("claims nothing when no show anywhere carries an entry", () => {
    // With an empty jam-chart corpus there is no frontier to read a show
    // against, so the page must stay silent rather than call everything pending.
    expect(awaitingJamCharts({ date: LATER, frontier: null, hasEntries: false })).toBe(false);
  });

  it("says nothing about a show with no setlist — an unplayed night has no jams to chart", () => {
    // Every announced tour date is a show row, and each one sits past the
    // frontier by definition. Without this, next winter's calendar reports that
    // its jam charts are running late.
    expect(awaitingJamCharts({
      date: LATER, frontier: ANNOTATED, hasEntries: false, hasSetlist: false,
    })).toBe(false);
  });
});

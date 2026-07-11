import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { upsertArtists, upsertVenues, upsertSongs, upsertShows, upsertPerformances } from "@/db/repository";

// Redirect the module-level `db` in stats.ts to the PGlite test db.
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

function perf(uniqueId: string, showId: number, songId: number, position: number) {
  return {
    uniqueId, showId, songId, setType: "Set", setNumber: "1", position, trackTime: null,
    transition: null, transitionId: null, isJamchart: false, jamchartNotes: null,
    isReprise: false, isJam: false, isVerified: true, footnote: null,
  };
}

beforeAll(async () => {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [
    { venueId: 1, name: "The Cap", slug: "cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 },
    // Never hosted a show — must not count toward `venues`.
    { venueId: 2, name: "Ghost Room", slug: "ghost", city: "Nowhere", state: "KS", country: "USA", zip: null, capacity: 100 },
  ]);
  await upsertSongs(ctx.db, [
    { songId: 700, name: "Hot Tea", slug: "hot-tea", isOriginal: true, originalArtist: null },
    { songId: 701, name: "Madhuvan", slug: "madhuvan", isOriginal: true, originalArtist: null },
    // In the songbook, never performed — must not count toward `songs`.
    { songId: 702, name: "Shelf Song", slug: "shelf-song", isOriginal: true, originalArtist: null },
  ]);
  // Two past shows, one future show.
  await upsertShows(ctx.db, [
    { showId: 1, showDate: "2020-01-01", artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p1", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    { showId: 2, showDate: "2020-01-02", artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p2", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    { showId: 3, showDate: "2030-01-01", artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p3", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
  ]);
  // Hot Tea played at both past shows (2 performances, 1 distinct song);
  // Madhuvan once. Shelf Song never played.
  await upsertPerformances(ctx.db, [
    perf("a", 1, 700, 1),
    perf("b", 2, 700, 1),
    perf("c", 2, 701, 2),
  ]);
});

describe("getOverviewStats", () => {
  it("counts only performed songs as `songs`, the whole book as `songsInCatalog`", async () => {
    const { getOverviewStats } = await import("./stats");
    const s = await getOverviewStats();
    expect(s.songs).toBe(2); // Hot Tea + Madhuvan; the never-played Shelf Song is excluded
    expect(s.songsInCatalog).toBe(3); // all three live in the book
  });

  it("splits shows into played vs upcoming and keeps the other counts honest", async () => {
    const { getOverviewStats } = await import("./stats");
    const s = await getOverviewStats();
    expect(s.showsPlayed).toBe(2);
    expect(s.upcoming).toBe(1);
    expect(s.performances).toBe(3);
    expect(s.venues).toBe(1); // Ghost Room has no shows
    expect(s.firstDate).toBe("2020-01-01");
    expect(s.lastPlayedDate).toBe("2020-01-02"); // the 2030 show doesn't count as played
  });
});

import { describe, it, expect, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { upsertArtists, upsertVenues, upsertTours, upsertSongs, upsertShows } from "@/db/repository";

// Redirect the module-level `db` to the PGlite test db (same pattern as songs.test.ts).
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

async function seed() {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [{ venueId: 1, name: "The Cap", slug: "cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 }]);
  await upsertTours(ctx.db, []);
  await upsertSongs(ctx.db, [
    { songId: 800, name: "Hot Tea", slug: "hot-tea", isOriginal: true, originalArtist: null },
    { songId: 801, name: "No Slug Yet", slug: null, isOriginal: true, originalArtist: null },
  ]);
  // Three shows across two dates — a two-show day must yield ONE sitemap date.
  await upsertShows(ctx.db, [
    { showId: 1, showDate: "2021-07-03", artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p1", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    { showId: 2, showDate: "2021-07-03", artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p2", showOrder: 2, notes: null, createdAt: null, updatedAt: null },
    { showId: 3, showDate: "2021-07-04", artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p3", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
  ]);
}

describe("sitemap queries", () => {
  it("allShowDates dedupes two-show days and sorts ascending", async () => {
    await seed();
    const { allShowDates } = await import("./sitemap");
    expect(await allShowDates()).toEqual(["2021-07-03", "2021-07-04"]);
  });

  it("allSongSlugs returns only songs that have slugs", async () => {
    const { allSongSlugs } = await import("./sitemap");
    expect(await allSongSlugs()).toEqual(["hot-tea"]);
  });
});

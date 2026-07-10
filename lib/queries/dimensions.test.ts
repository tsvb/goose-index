import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { upsertArtists, upsertVenues, upsertTours, upsertShows } from "@/db/repository";

// Redirect the module-level `db` in dimensions.ts to the PGlite test db.
// vi.mock is hoisted; the lambda captures `_testDb` which is set before any test runs.
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

beforeAll(async () => {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [
    { venueId: 1, name: "Red Rocks Amphitheatre", slug: "red-rocks", city: "Morrison", state: "CO", country: "USA", zip: null, capacity: 9525 },
    { venueId: 2, name: "Red Hat Amphitheater", slug: "red-hat", city: "Raleigh", state: "NC", country: "USA", zip: null, capacity: 6000 },
    { venueId: 3, name: "Redemption Hall", slug: "redemption-hall", city: "Topeka", state: "KS", country: "USA", zip: null, capacity: null }, // never hosted a show
    { venueId: 4, name: "The Capitol Theatre", slug: "the-cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 },
  ]);
  await upsertTours(ctx.db, [
    { tourId: 1, name: "Summer Tour 2024", year: 2024 },
    { tourId: 2, name: "Fall Tour 2024", year: 2024 },
    { tourId: 3, name: "Cancelled Tour 2024", year: 2024 }, // no shows
  ]);
  const mkShow = (showId: number, showDate: string, venueId: number, tourId: number | null) => ({
    showId, showDate, artistId: 1, venueId, tourId,
    title: null, permalink: `p${showId}`, showOrder: 1, notes: null, createdAt: null, updatedAt: null,
  });
  await upsertShows(ctx.db, [
    mkShow(1, "2024-06-01", 1, 1),
    mkShow(2, "2024-06-02", 1, 1),
    mkShow(3, "2024-06-03", 1, null),
    mkShow(4, "2024-09-15", 2, 2),
    mkShow(5, "2024-10-01", 4, null),
  ]);
});

describe("searchVenues", () => {
  it("matches name text, orders by show count, and excludes venues with no shows", async () => {
    const { searchVenues } = await import("./dimensions");
    const r = await searchVenues("red");
    expect(r.rows.map((v) => v.name)).toEqual(["Red Rocks Amphitheatre", "Red Hat Amphitheater"]);
    expect(r.rows.map((v) => v.shows)).toEqual([3, 1]);
    expect(r.total).toBe(2); // Redemption Hall matches the text but never hosted a show
  });

  it("matches on city", async () => {
    const { searchVenues } = await import("./dimensions");
    const r = await searchVenues("port chester");
    expect(r.rows.map((v) => v.venueId)).toEqual([4]);
    expect(r.total).toBe(1);
  });

  it("total counts matches beyond the limit", async () => {
    const { searchVenues } = await import("./dimensions");
    const r = await searchVenues("red", 1);
    expect(r.rows.map((v) => v.name)).toEqual(["Red Rocks Amphitheatre"]);
    expect(r.total).toBe(2);
  });

  it("returns empty when nothing matches", async () => {
    const { searchVenues } = await import("./dimensions");
    expect(await searchVenues("zzzz")).toEqual({ rows: [], total: 0 });
  });
});

describe("searchTours", () => {
  it("matches tour names newest-first and excludes tours with no shows", async () => {
    const { searchTours } = await import("./dimensions");
    const r = await searchTours("tour");
    expect(r.rows.map((t) => t.name)).toEqual(["Fall Tour 2024", "Summer Tour 2024"]);
    expect(r.rows.map((t) => t.shows)).toEqual([1, 2]);
    expect(r.total).toBe(2); // Cancelled Tour matches the text but has no shows
  });

  it("total counts matches beyond the limit", async () => {
    const { searchTours } = await import("./dimensions");
    const r = await searchTours("tour", 1);
    expect(r.rows.map((t) => t.name)).toEqual(["Fall Tour 2024"]);
    expect(r.total).toBe(2);
  });

  it("returns empty when nothing matches", async () => {
    const { searchTours } = await import("./dimensions");
    expect(await searchTours("zzzz")).toEqual({ rows: [], total: 0 });
  });
});

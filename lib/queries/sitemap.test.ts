import { describe, it, expect, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { upsertArtists, upsertVenues, upsertTours, upsertSongs, upsertShows, upsertPerformances } from "@/db/repository";

// Redirect the module-level `db` to the PGlite test db (same pattern as songs.test.ts).
let _testDb: Awaited<ReturnType<typeof makeTestDb>>["db"] | null = null;
vi.mock("@/db/client", () => ({
  db: new Proxy({} as Record<string | symbol, unknown>, {
    get(_t, prop) {
      if (!_testDb) throw new Error("Test db not initialized");
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
  // Venue 2 and tour 6 have no shows — they must stay out of the sitemap.
  await upsertVenues(ctx.db, [
    { venueId: 1, name: "The Cap", slug: "cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 },
    { venueId: 2, name: "No Shows Hall", slug: "no-shows", city: "Nowhere", state: "KS", country: "USA", zip: null, capacity: 500 },
    { venueId: 3, name: "Future Field", slug: "future", city: "Later", state: "VT", country: "USA", zip: null, capacity: 9000 },
  ]);
  await upsertTours(ctx.db, [
    { tourId: 5, name: "Summer 2021", year: 2021 },
    { tourId: 6, name: "Phantom Tour", year: 2021 },
  ]);
  await upsertSongs(ctx.db, [
    { songId: 800, name: "Hot Tea", slug: "hot-tea", isOriginal: true, originalArtist: null },
    { songId: 801, name: "No Slug Yet", slug: null, isOriginal: true, originalArtist: null },
    // In elgoose's catalog, never played by Goose — must stay out of the sitemap.
    { songId: 802, name: "Never Played", slug: "never-played", isOriginal: false, originalArtist: "Someone" },
  ]);
  // Four shows across three dates and two years — a two-show day must yield
  // ONE sitemap date, and shows 1/2/4 share tour 5 (one /tours/5 entry).
  // Show 5 is upcoming (2099), so it adds a URL but its date isn't a lastmod;
  // its updated_at is. Show 2's updated_at is a MySQL zero date — ignored.
  await upsertShows(ctx.db, [
    { showId: 1, showDate: "2021-07-03", artistId: 1, venueId: 1, tourId: 5, title: null, permalink: "p1", showOrder: 1, notes: null, createdAt: null, updatedAt: "2021-07-05 09:00:00" },
    { showId: 2, showDate: "2021-07-03", artistId: 1, venueId: 1, tourId: 5, title: null, permalink: "p2", showOrder: 2, notes: null, createdAt: null, updatedAt: "0000-00-00 00:00:00" },
    { showId: 3, showDate: "2021-07-04", artistId: 1, venueId: 1, tourId: null, title: null, permalink: "p3", showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    { showId: 4, showDate: "2022-01-01", artistId: 1, venueId: 1, tourId: 5, title: null, permalink: "p4", showOrder: 1, notes: null, createdAt: null, updatedAt: "2021-12-01 00:00:00" },
    { showId: 5, showDate: "2099-12-31", artistId: 1, venueId: 3, tourId: null, title: null, permalink: "p5", showOrder: 1, notes: null, createdAt: null, updatedAt: "2023-03-03 12:00:00" },
  ]);
  const play = (uniqueId: string, showId: number) => ({ uniqueId, showId, songId: 800, setType: "Set", setNumber: "1", position: 1, trackTime: null, transition: null, transitionId: null, isJamchart: false, jamchartNotes: null, isReprise: false, isJam: false, isVerified: true, footnote: null });
  await upsertPerformances(ctx.db, [play("a", 1), play("b", 3)]);
}

const keys = <K>(rows: { key: K }[]) => rows.map((r) => r.key);
const stamp = <K>(rows: { key: K; lastmod: string | undefined }[], key: K) => rows.find((r) => r.key === key)?.lastmod;

describe("sitemap queries", () => {
  it("allShowDates dedupes two-show days and sorts ascending", async () => {
    await seed();
    const { allShowDates } = await import("./sitemap");
    expect(keys(await allShowDates())).toEqual(["2021-07-03", "2021-07-04", "2022-01-01", "2099-12-31"]);
  });

  it("allSongSlugs returns only played songs that have slugs", async () => {
    const { allSongSlugs } = await import("./sitemap");
    expect(keys(await allSongSlugs())).toEqual(["hot-tea"]);
  });

  it("allYears returns each year once, ascending", async () => {
    const { allYears } = await import("./sitemap");
    expect(keys(await allYears())).toEqual([2021, 2022, 2099]);
  });

  it("allTourIds dedupes and skips tours with no shows", async () => {
    const { allTourIds } = await import("./sitemap");
    expect(keys(await allTourIds())).toEqual([5]);
  });

  it("allVenueIds dedupes and skips venues with no shows", async () => {
    const { allVenueIds } = await import("./sitemap");
    expect(keys(await allVenueIds())).toEqual([1, 3]);
  });
});

describe("sitemap lastmod", () => {
  it("dates a played show by the later of its date and elgoose's updated_at", async () => {
    const { allShowDates } = await import("./sitemap");
    const rows = await allShowDates();
    expect(stamp(rows, "2021-07-03")).toBe("2021-07-05"); // updated after; zero date on show 2 ignored
    expect(stamp(rows, "2021-07-04")).toBe("2021-07-04"); // no updated_at — the show date
    expect(stamp(rows, "2022-01-01")).toBe("2022-01-01"); // updated before the show — the show date
  });

  it("dates an upcoming show by its updated_at only, never its future date", async () => {
    const { allShowDates } = await import("./sitemap");
    expect(stamp(await allShowDates(), "2099-12-31")).toBe("2023-03-03");
  });

  it("dates a song by the shows it was played at", async () => {
    const { allSongSlugs } = await import("./sitemap");
    expect(stamp(await allSongSlugs(), "hot-tea")).toBe("2021-07-05");
  });

  it("dates years, tours, venues, and the catalog by the latest of their shows", async () => {
    const { allYears, allTourIds, allVenueIds, catalogLastmod } = await import("./sitemap");
    expect(stamp(await allYears(), 2021)).toBe("2021-07-05");
    expect(stamp(await allYears(), 2099)).toBe("2023-03-03");
    expect(stamp(await allTourIds(), 5)).toBe("2022-01-01");
    expect(stamp(await allVenueIds(), 1)).toBe("2022-01-01");
    expect(await catalogLastmod()).toBe("2023-03-03");
  });
});

describe("lastmodOf", () => {
  it("never dates past today", async () => {
    const { lastmodOf } = await import("./sitemap");
    expect(lastmodOf("2026-10-09", "2026-10-11 02:00:00", "2026-10-10")).toBe("2026-10-10");
  });

  it("is undefined when nothing dates the page", async () => {
    const { lastmodOf } = await import("./sitemap");
    expect(lastmodOf(null, null, "2026-10-10")).toBeUndefined();
    expect(lastmodOf(null, "0000-00-00 00:00:00", "2026-10-10")).toBeUndefined();
    expect(lastmodOf(null, "2021-02-30 00:00:00", "2026-10-10")).toBeUndefined();
    expect(lastmodOf(null, "garbage", "2026-10-10")).toBeUndefined();
  });
});

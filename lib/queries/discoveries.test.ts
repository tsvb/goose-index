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

const { originalsOnTheShelf, SHELF_MIN_PLAYS } = await import("@/lib/queries/discoveries");

// elgoose tags improvised jams, ambient segments and interstitials as original
// "songs", so each of these is `is_original` in the real data.
const NON_SONGS = [
  "Jam",
  "20 Minute Jam",
  "Beast Pose Jam",
  "(dawn)",
  "(((postplace)))",
  "Interlude II",
  "Trevor Reads Poetry",
  "Drums",
];
const REAL_SONGS = ["Life On The Shelf", "Dragonfly", "Butterflies", "Factory Fiction"];

function perf(uniqueId: string, showId: number, songId: number, position: number) {
  return {
    uniqueId, showId, songId, setType: "Set", setNumber: "1", position, trackTime: null,
    transition: null, transitionId: null, isJamchart: false, jamchartNotes: null,
    isReprise: false, isJam: false, isVerified: true, footnote: null,
  };
}

const slugify = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

beforeAll(async () => {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [
    { venueId: 1, name: "The Cap", slug: "cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 },
  ]);

  const names = [...NON_SONGS, ...REAL_SONGS];
  await upsertSongs(ctx.db, names.map((name, i) => ({
    songId: 700 + i, name, slug: slugify(name), isOriginal: true, originalArtist: null,
  })));

  // SHELF_MIN_PLAYS shows, long in the past, so every song above clears the
  // play threshold and would otherwise land on the shelf.
  await upsertShows(ctx.db, Array.from({ length: SHELF_MIN_PLAYS }, (_, i) => ({
    showId: i + 1, showDate: `2020-01-0${i + 1}`, artistId: 1, venueId: 1, tourId: null,
    title: null, permalink: `p${i + 1}`, showOrder: 1, notes: null, createdAt: null, updatedAt: null,
  })));

  await upsertPerformances(ctx.db, names.flatMap((name, songIdx) =>
    Array.from({ length: SHELF_MIN_PLAYS }, (_, showIdx) =>
      perf(`u-${songIdx}-${showIdx}`, showIdx + 1, 700 + songIdx, songIdx + 1)),
  ));
});

describe("originalsOnTheShelf", () => {
  it("excludes jams, bracketed segments and interstitials that elgoose tags as originals", async () => {
    const shelved = (await originalsOnTheShelf()).map((r) => r.name);
    expect(shelved).not.toContain("Jam");
    expect(shelved).not.toContain("Trevor Reads Poetry");
    for (const name of NON_SONGS) expect(shelved).not.toContain(name);
  });

  it("keeps real originals", async () => {
    const shelved = (await originalsOnTheShelf()).map((r) => r.name);
    for (const name of REAL_SONGS) expect(shelved).toContain(name);
  });
});

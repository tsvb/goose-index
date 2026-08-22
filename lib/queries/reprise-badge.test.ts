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

const { getSetlist } = await import("@/lib/queries/shows");
const { getSongPerformances, firstPlayFlags } = await import("@/lib/queries/songs");

/**
 * A song returns once a night.
 *
 * `gap` is per (song, show) on purpose, so a reprise can't produce a negative
 * gap — but the badge is drawn per performance, so a sandwich of a shelved song
 * marked both halves. Vancouver 2026-08-18 is the live case: "Time to Flee ·
 * first in 43 shows" twice, two rows apart, the second contradicted by the
 * first two rows above it.
 *
 * The fixture: a song played on show 1, shelved for eighteen, then sandwiched
 * on show 20 — one return, two performances.
 */
const SHELVED = 900;
const FILLER = 901;
const RETURN_SHOW = 20;

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
  ]);
  await upsertSongs(ctx.db, [
    { songId: SHELVED, name: "Time to Flee", slug: "time-to-flee", isOriginal: true, originalArtist: null },
    { songId: FILLER, name: "Hot Tea", slug: "hot-tea", isOriginal: true, originalArtist: null },
  ]);

  await upsertShows(ctx.db, Array.from({ length: RETURN_SHOW }, (_, i) => ({
    showId: i + 1,
    showDate: `2020-01-${String(i + 1).padStart(2, "0")}`,
    artistId: 1, venueId: 1, tourId: null, title: null,
    permalink: `p${i + 1}`, showOrder: 1, notes: null, createdAt: null, updatedAt: null,
  })));

  await upsertPerformances(ctx.db, [
    // Every night has the filler, so each show counts in the ledger.
    ...Array.from({ length: RETURN_SHOW }, (_, i) => perf(`f-${i + 1}`, i + 1, FILLER, 1)),
    // The shelved song: once at the start...
    perf("s-first", 1, SHELVED, 2),
    // ...then sandwiched around the filler on the return night.
    perf("s-return", RETURN_SHOW, SHELVED, 2),
    perf("s-filler", RETURN_SHOW, FILLER, 3),
    perf("s-reprise", RETURN_SHOW, SHELVED, 4),
  ]);
});

describe("firstPlayFlags", () => {
  it("marks the first of each id and nothing after it", () => {
    expect(firstPlayFlags([7, 9, 7, 7, 9])).toEqual([true, true, false, false, false]);
  });

  it("is all true when nothing repeats", () => {
    expect(firstPlayFlags([1, 2, 3])).toEqual([true, true, true]);
  });

  it("handles an empty list", () => {
    expect(firstPlayFlags([])).toEqual([]);
  });
});

describe("the return badge falls on the first play of the night", () => {
  it("marks the song's first play in the setlist, not the reprise", async () => {
    const entries = await getSetlist(RETURN_SHOW);
    const flees = entries.filter((e) => e.song === "Time to Flee");
    expect(flees).toHaveLength(2);
    // Both share the night's gap — that stays true, it is a fact about the show.
    expect(flees.map((e) => e.gap)).toEqual([18, 18]);
    // Only the first is the return.
    expect(flees.map((e) => e.isDustedOff)).toEqual([true, false]);
  });

  it("counts one return on the song page, not two", async () => {
    const perfs = await getSongPerformances(SHELVED);
    expect(perfs).toHaveLength(3);
    // The sparkline counts busts by this flag; a sandwich used to score two.
    expect(perfs.filter((p) => p.isDustedOff)).toHaveLength(1);
    const returned = perfs.find((p) => p.isDustedOff);
    expect(returned?.uniqueId).toBe("s-return");
  });

  it("leaves a song that only plays once a night untouched", async () => {
    // The filler plays every night with no gap to speak of — nothing marked,
    // and the guard must not change that.
    const perfs = await getSongPerformances(FILLER);
    expect(perfs.filter((p) => p.isDustedOff)).toHaveLength(0);
  });
});

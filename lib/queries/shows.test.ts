import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { makeTestDb } from "@/db/testing";
import {
  upsertArtists, upsertVenues, upsertTours, upsertSongs, upsertShows, upsertPerformances,
} from "@/db/repository";

// Redirect the module-level `db` in shows.ts to the PGlite test db.
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

const RETURNING_SONG_ID = 800;
const FILLER_SONG_ID = 801;

/**
 * Seed 20 shows on distinct dates.
 * Filler song (801) plays every show so show_seq spans all 20.
 * Returning song (800) plays at show 1 (seq 1) and show 20 (seq 20).
 *   gap = 20 - 1 - 1 = 18; only one gap so p95 = 18; ceil(18) = 18; 18 >= 15 && 18 >= 18 → isDustedOff.
 */
async function seed() {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [{ venueId: 1, name: "The Cap", slug: "cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 }]);
  await upsertTours(ctx.db, []);
  await upsertSongs(ctx.db, [
    { songId: RETURNING_SONG_ID, name: "Returning Song", slug: "returning-song", isOriginal: true, originalArtist: null },
    { songId: FILLER_SONG_ID, name: "Filler Song", slug: "filler-song", isOriginal: true, originalArtist: null },
  ]);

  // 20 shows on consecutive dates
  const dates = Array.from({ length: 20 }, (_, i) => {
    const d = new Date("2020-01-01");
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  await upsertShows(ctx.db, dates.map((d, i) => ({
    showId: i + 1, showDate: d, artistId: 1, venueId: 1, tourId: null,
    title: null, permalink: `p${i}`, showOrder: 1, notes: null, createdAt: null, updatedAt: null,
  })));

  const perf: any[] = [];
  // Filler song every show (so all 20 shows have performances and appear in show_seq)
  dates.forEach((_, i) => perf.push({
    uniqueId: `f${i}`, showId: i + 1, songId: FILLER_SONG_ID,
    setType: "Set", setNumber: "1", position: 1, trackTime: "5:00",
    transition: null, transitionId: null, isJamchart: false, jamchartNotes: null,
    isReprise: false, isJam: false, isVerified: true, footnote: null,
  }));
  // Returning song: show 1 (seq=1) and show 20 (seq=20) → gap = 18
  [0, 19].forEach((i) => perf.push({
    uniqueId: `r${i}`, showId: i + 1, songId: RETURNING_SONG_ID,
    setType: "Set", setNumber: "1", position: 2, trackTime: "10:00",
    transition: null, transitionId: null, isJamchart: false, jamchartNotes: null,
    isReprise: false, isJam: false, isVerified: true, footnote: null,
  }));
  await upsertPerformances(ctx.db, perf);
}

const returnShowId = 20; // show 20 is where the "return" happens

describe("getSetlist gap + Dusted Off enrichment", () => {
  it("computes gap and marks isDustedOff for a long-absent song", async () => {
    await seed();
    const { getSetlist } = await import("./shows");
    const entries = await getSetlist(returnShowId);
    const e = entries.find((x) => x.songId === RETURNING_SONG_ID)!;
    expect(e).toBeDefined();
    expect(e.gap).toBe(18);
    expect(e.isDustedOff).toBe(true);
  });

  it("non-absent songs have gap=null or isDustedOff=false", async () => {
    const { getSetlist } = await import("./shows");
    // Show 2 has only the filler song (played at show 1 → gap=0, not dusted off)
    const entries = await getSetlist(2);
    const filler = entries.find((x) => x.songId === FILLER_SONG_ID)!;
    expect(filler).toBeDefined();
    expect(filler.isDustedOff).toBe(false);
  });
});

describe("searchShows", () => {
  beforeAll(async () => {
    await seed();
    // Two shows on the same date a year after the seed run: exercises multi-show
    // dates and across-years month-day matching.
    await upsertShows(ctx.db, [30, 31].map((id, i) => ({
      showId: id, showDate: "2021-01-05", artistId: 1, venueId: 1, tourId: null,
      title: null, permalink: `p${id}`, showOrder: i + 1, notes: null, createdAt: null, updatedAt: null,
    })));
  });

  it("substring-matches venue and city text and reports the full total", async () => {
    const { searchShows } = await import("./shows");
    const r = await searchShows("port chester", 5);
    expect(r.rows).toHaveLength(5); // truncated to the limit…
    expect(r.total).toBe(22);       // …but the total spans every show at The Cap
    expect(r.rows[0].date).toBe("2021-01-05"); // newest first
    expect(r.rows[0].order).toBe(2);
  });

  it("still substring-matches partial dates as text", async () => {
    const { searchShows } = await import("./shows");
    const r = await searchShows("2020-01", 5);
    expect(r.rows).toHaveLength(5);
    expect(r.total).toBe(20);
  });

  it("matches an exact ISO date", async () => {
    const { searchShows } = await import("./shows");
    const r = await searchShows("2020-01-05");
    expect(r.total).toBe(1);
    expect(r.rows.map((s) => s.date)).toEqual(["2020-01-05"]);
  });

  it("returns every show on a multi-show date", async () => {
    const { searchShows } = await import("./shows");
    const r = await searchShows("2021-01-05");
    expect(r.total).toBe(2);
    expect(r.rows.map((s) => s.showId)).toEqual([31, 30]); // show order desc
  });

  it("natural date formats return the same shows as ISO", async () => {
    const { searchShows } = await import("./shows");
    const iso = await searchShows("2021-01-05");
    for (const q of ["1/5/2021", "01/05/2021", "1-5-2021", "jan 5 2021", "January 5, 2021", "Jan 5th 2021"]) {
      const r = await searchShows(q);
      expect(r.total).toBe(iso.total);
      expect(r.rows.map((s) => s.showId)).toEqual(iso.rows.map((s) => s.showId));
    }
  });

  it("month + day with no year matches across years", async () => {
    const { searchShows } = await import("./shows");
    for (const q of ["jan 5", "1/5", "January 5th"]) {
      const r = await searchShows(q);
      expect(r.total).toBe(3);
      expect(r.rows.map((s) => s.date)).toEqual(["2021-01-05", "2021-01-05", "2020-01-05"]);
    }
  });

  it("date-shaped queries with no shows return an empty result", async () => {
    const { searchShows } = await import("./shows");
    expect(await searchShows("3/3/1999")).toEqual({ rows: [], total: 0 });
  });
});

describe("getShowNeighbors", () => {
  beforeAll(async () => {
    await seed();
    // A three-show date flanked by single-show dates: 6/24 · 6/25 (n=1,2,3) · 6/26.
    await upsertShows(ctx.db, [
      { showId: 40, showDate: "2022-06-24", showOrder: 1 },
      { showId: 41, showDate: "2022-06-25", showOrder: 1 },
      { showId: 42, showDate: "2022-06-25", showOrder: 2 },
      { showId: 43, showDate: "2022-06-25", showOrder: 3 },
      { showId: 44, showDate: "2022-06-26", showOrder: 1 },
    ].map((s) => ({
      ...s, artistId: 1, venueId: 1, tourId: null,
      title: null, permalink: `p${s.showId}`, notes: null, createdAt: null, updatedAt: null,
    })));
  });

  it("walks forward through a multi-show date: n=1 → n=2 → n=3 → next date", async () => {
    const { getShowNeighbors } = await import("./shows");
    const from1 = await getShowNeighbors("2022-06-25", 1);
    expect(from1.next).toMatchObject({ date: "2022-06-25", order: 2 });
    const from2 = await getShowNeighbors("2022-06-25", 2);
    expect(from2.next).toMatchObject({ date: "2022-06-25", order: 3 });
    const from3 = await getShowNeighbors("2022-06-25", 3);
    expect(from3.next).toMatchObject({ date: "2022-06-26", order: 1 });
  });

  it("walks backward through a multi-show date: n=3 → n=2 → n=1 → previous date", async () => {
    const { getShowNeighbors } = await import("./shows");
    const from3 = await getShowNeighbors("2022-06-25", 3);
    expect(from3.prev).toMatchObject({ date: "2022-06-25", order: 2 });
    const from2 = await getShowNeighbors("2022-06-25", 2);
    expect(from2.prev).toMatchObject({ date: "2022-06-25", order: 1 });
    const from1 = await getShowNeighbors("2022-06-25", 1);
    expect(from1.prev).toMatchObject({ date: "2022-06-24", order: 1 });
  });

  it("crosses the date boundary from the flanking single-show dates", async () => {
    const { getShowNeighbors } = await import("./shows");
    const before = await getShowNeighbors("2022-06-24", 1);
    expect(before.next).toMatchObject({ date: "2022-06-25", order: 1 });
    const after = await getShowNeighbors("2022-06-26", 1);
    expect(after.prev).toMatchObject({ date: "2022-06-25", order: 3 });
  });

  it("treats a null order as show 1", async () => {
    const { getShowNeighbors } = await import("./shows");
    const r = await getShowNeighbors("2022-06-25", null);
    expect(r.prev).toMatchObject({ date: "2022-06-24", order: 1 });
    expect(r.next).toMatchObject({ date: "2022-06-25", order: 2 });
  });

  it("returns null at the edges of the timeline", async () => {
    const { getShowNeighbors } = await import("./shows");
    const first = await getShowNeighbors("2020-01-01", 1);
    expect(first.prev).toBeNull();
    const last = await getShowNeighbors("2022-06-26", 1);
    expect(last.next).toBeNull();
  });
});

describe("getTonightShows", () => {
  it("returns an empty list when no show is dated today", async () => {
    await seed();
    const { getTonightShows } = await import("./shows");
    expect(await getTonightShows()).toEqual([]);
  });

  it("returns only today's shows, in show order", async () => {
    // The db decides what "today" is (avoids TZ drift between JS and Postgres).
    const res = await (ctx.db as unknown as { execute: (q: unknown) => Promise<unknown> })
      .execute(sql`select current_date::text as today, (current_date + 1)::text as tomorrow`);
    const rows = (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as { today: string; tomorrow: string }[];
    const { today, tomorrow } = rows[0];
    // Two shows today (seeded out of order) and one tomorrow.
    await upsertShows(ctx.db, [
      { showId: 60, showDate: today, showOrder: 2 },
      { showId: 61, showDate: today, showOrder: 1 },
      { showId: 62, showDate: tomorrow, showOrder: 1 },
    ].map((s) => ({
      ...s, artistId: 1, venueId: 1, tourId: null,
      title: null, permalink: `p${s.showId}`, notes: null, createdAt: null, updatedAt: null,
    })));

    const { getTonightShows } = await import("./shows");
    const tonight = await getTonightShows();
    expect(tonight.map((s) => s.showId)).toEqual([61, 60]);
    expect(tonight.every((s) => s.date === today)).toBe(true);
  });

  it("keeps today inside getRecentShows — the home page filters it out itself", async () => {
    const { getRecentShows } = await import("./shows");
    const recent = await getRecentShows(3);
    expect(recent[0].showId).toBe(60); // today, highest show order first
    expect(recent.map((s) => s.showId)).not.toContain(62); // tomorrow stays upcoming
  });
});

describe("getShowEntryNumber", () => {
  beforeAll(async () => {
    await seed(); // shows 1..20 (2020-01-01..20), each with performances
    // A played multi-show date after the seeded run (orders 1+2), a next-day
    // show with a NULL order, a played show with no performances, and an
    // upcoming show that (perversely) already has a performance row — to prove
    // the date guard holds independently of the performances guard.
    const res = await (ctx.db as unknown as { execute: (q: unknown) => Promise<unknown> })
      .execute(sql`select (current_date + 1)::text as tomorrow`);
    const rows = (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as { tomorrow: string }[];
    const { tomorrow } = rows[0];
    await upsertShows(ctx.db, [
      { showId: 80, showDate: "2023-05-01", showOrder: 1 },
      { showId: 81, showDate: "2023-05-01", showOrder: 2 },
      { showId: 82, showDate: "2023-05-02", showOrder: null },
      { showId: 83, showDate: "2023-05-03", showOrder: 1 }, // no performances
      { showId: 84, showDate: tomorrow, showOrder: 1 },
    ].map((s) => ({
      ...s, artistId: 1, venueId: 1, tourId: null,
      title: null, permalink: `p${s.showId}`, notes: null, createdAt: null, updatedAt: null,
    })));
    await upsertPerformances(ctx.db, [80, 81, 82, 84].map((id) => ({
      uniqueId: `en${id}`, showId: id, songId: FILLER_SONG_ID,
      setType: "Set", setNumber: "1", position: 1, trackTime: "5:00",
      transition: null, transitionId: null, isJamchart: false, jamchartNotes: null,
      isReprise: false, isJam: false, isVerified: true, footnote: null,
    })));
  });

  it("numbers the played ledger 1-based, matching SHOW_SEQ's (date, order) walk", async () => {
    const { getShowEntryNumber } = await import("./shows");
    expect(await getShowEntryNumber("2020-01-01", 1)).toBe(1);
    expect(await getShowEntryNumber("2020-01-20", 1)).toBe(20);
  });

  it("steps through a multi-show date by show order, and treats null order as 1", async () => {
    const { getShowEntryNumber } = await import("./shows");
    // Shows 30/31, 40-44, 60/61 (earlier suites) have no performances, so the
    // ledger continues straight from the 20 seeded shows.
    expect(await getShowEntryNumber("2023-05-01", 1)).toBe(21);
    expect(await getShowEntryNumber("2023-05-01", 2)).toBe(22);
    expect(await getShowEntryNumber("2023-05-02", null)).toBe(23);
  });

  it("returns null for a played show with no performances logged", async () => {
    const { getShowEntryNumber } = await import("./shows");
    expect(await getShowEntryNumber("2023-05-03", 1)).toBeNull();
  });

  it("returns null for an upcoming show even if a performance row sneaks in", async () => {
    const { getShowEntryNumber } = await import("./shows");
    const res = await (ctx.db as unknown as { execute: (q: unknown) => Promise<unknown> })
      .execute(sql`select (current_date + 1)::text as tomorrow`);
    const rows = (Array.isArray(res) ? res : (res as { rows: unknown[] }).rows) as { tomorrow: string }[];
    expect(await getShowEntryNumber(rows[0].tomorrow, 1)).toBeNull();
  });

  it("returns null for a date with no show at all", async () => {
    const { getShowEntryNumber } = await import("./shows");
    expect(await getShowEntryNumber("1999-01-01", 1)).toBeNull();
  });
});

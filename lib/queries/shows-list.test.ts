import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { etToday } from "@/lib/today";
import { upsertArtists, upsertVenues, upsertTours, upsertShows } from "@/db/repository";

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

const TOUR_ID = 9;

// The site's clock, not the database's — see lib/today.ts.
const today = () => etToday();

beforeAll(async () => {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [{ venueId: 1, name: "The Cap", slug: "cap", city: "Port Chester", state: "NY", country: "USA", zip: null, capacity: 1800 }]);
  await upsertTours(ctx.db, [{ tourId: TOUR_ID, name: "Summer Tour 2021", year: 2021 }]);

  // 6 past stand-alone shows, 2 past tour shows, 1 future show.
  const rows = [
    ...["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04", "2020-01-05", "2020-01-06"].map((d, i) => ({
      showId: i + 1, showDate: d, tourId: null,
    })),
    { showId: 7, showDate: "2021-06-01", tourId: TOUR_ID },
    { showId: 8, showDate: "2021-06-02", tourId: TOUR_ID },
    { showId: 9, showDate: "2030-01-01", tourId: null },
  ];
  await upsertShows(ctx.db, rows.map((r) => ({
    showId: r.showId, showDate: r.showDate, artistId: 1, venueId: 1, tourId: r.tourId,
    title: null, permalink: `p${r.showId}`, showOrder: 1, notes: null, createdAt: null, updatedAt: null,
  })));
});

describe("findLatestPastShow", () => {
  it("finds the most recent past show across all shows, ignoring the future one", async () => {
    const { findLatestPastShow } = await import("./shows");
    const r = await findLatestPastShow({ dir: "asc", perPage: 50 });
    expect(r).not.toBeNull();
    expect(r!.showId).toBe(8); // 2021-06-02, the latest date <= today
    expect(r!.date).toBe("2021-06-02");
    expect(r!.isToday).toBe(false);
    expect(r!.page).toBe(1); // rank 8 of 9, 50/page
  });

  it("computes the page from rank under asc sorting", async () => {
    const { findLatestPastShow } = await import("./shows");
    const r = await findLatestPastShow({ dir: "asc", perPage: 5 });
    expect(r!.page).toBe(2); // asc rank 8 -> ceil(8/5)
  });

  it("computes the page from rank under desc sorting", async () => {
    const { findLatestPastShow } = await import("./shows");
    const r = await findLatestPastShow({ dir: "desc", perPage: 5 });
    // desc order: 2030(1), 2021-06-02(2) -> ceil(2/5) = 1
    expect(r!.page).toBe(1);
  });

  it("scopes to the active tour filter", async () => {
    const { findLatestPastShow } = await import("./shows");
    const r = await findLatestPastShow({ tourId: TOUR_ID, dir: "asc", perPage: 50 });
    expect(r!.showId).toBe(8);
    expect(r!.page).toBe(1);
  });

  it("returns null when the filter has no past show", async () => {
    const { findLatestPastShow } = await import("./shows");
    const r = await findLatestPastShow({ year: 2030, dir: "asc", perPage: 50 });
    expect(r).toBeNull();
  });

  it("flags a show happening today", async () => {
    const { findLatestPastShow } = await import("./shows");
    const d = today();
    await upsertShows(ctx.db, [{
      showId: 50, showDate: d, artistId: 1, venueId: 1, tourId: null,
      title: null, permalink: "ptoday", showOrder: 1, notes: null, createdAt: null, updatedAt: null,
    }]);
    const r = await findLatestPastShow({ dir: "asc", perPage: 50 });
    expect(r!.showId).toBe(50);
    expect(r!.date).toBe(d);
    expect(r!.isToday).toBe(true);
  });

  // 9:50pm ET the night before a show. Postgres runs UTC in production, so
  // `current_date` had already rolled over to the show's date, and the shows
  // page put a "tonight's show" jump on a night with no show.
  describe("across the UTC date rollover", () => {
    const eveningBefore = new Date("2029-06-15T01:50:00Z"); // 2029-06-14 21:50 ET
    const afterEtMidnight = new Date("2029-06-15T05:00:00Z"); // 2029-06-15 01:00 ET

    beforeAll(async () => {
      await upsertShows(ctx.db, [{
        showId: 52, showDate: "2029-06-15", artistId: 1, venueId: 1, tourId: null,
        title: null, permalink: "p52", showOrder: 1, notes: null, createdAt: null, updatedAt: null,
      }]);
    });
    beforeEach(() => vi.useFakeTimers({ toFake: ["Date"] }));
    afterEach(() => vi.useRealTimers());

    it("leaves tomorrow night's show in the future all evening", async () => {
      vi.setSystemTime(eveningBefore);
      const { findLatestPastShow } = await import("./shows");
      const r = await findLatestPastShow({ dir: "asc", perPage: 50 });
      expect(r!.showId).not.toBe(52);
      expect(r!.isToday).toBe(false); // no show tonight → "most recent show"
    });

    it("flags it once ET itself reaches the date", async () => {
      vi.setSystemTime(afterEtMidnight);
      const { findLatestPastShow } = await import("./shows");
      const r = await findLatestPastShow({ dir: "asc", perPage: 50 });
      expect(r!.showId).toBe(52);
      expect(r!.isToday).toBe(true);
    });
  });
});

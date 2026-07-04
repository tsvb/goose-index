import { describe, it, expect, afterAll, vi } from "vitest";
import { makeTestDb } from "../../db/testing";
import { upsertArtists, upsertVenues, upsertTours, upsertShows } from "../../db/repository";

// maybe-live imports the app db client at module level; tests inject their own.
vi.mock("@/db/client", () => ({ db: {} }));

const ctx = await makeTestDb();
afterAll(() => ctx.close());

// A July evening (8pm ET) on a night with a show, and one without.
const SHOW_NIGHT = new Date("2026-07-04T20:00:00-04:00");
const OFF_NIGHT = new Date("2026-07-06T20:00:00-04:00");
const DAYTIME = new Date("2026-07-04T10:00:00-04:00");

async function seedShow() {
  await upsertArtists(ctx.db, [{ artistId: 1, name: "Goose" }]);
  await upsertVenues(ctx.db, [{ venueId: 366, name: "SPAC", slug: null, city: "Saratoga Springs", state: "NY", country: "USA", zip: null, capacity: null }]);
  await upsertTours(ctx.db, []);
  await upsertShows(ctx.db, [{ showId: 900, showDate: "2026-07-04", artistId: 1, venueId: 366, tourId: null, title: null, permalink: "p", showOrder: 1, notes: null, createdAt: null, updatedAt: null }]);
}

describe("maybeLiveSync", () => {
  it("outside the live window → not live, no db work", async () => {
    const { maybeLiveSync } = await import("./maybe-live");
    expect(await maybeLiveSync({ db: ctx.db, now: DAYTIME })).toEqual({ live: false });
  });

  it("in the window but no show that date → not live", async () => {
    await seedShow();
    const { maybeLiveSync } = await import("./maybe-live");
    const status = await maybeLiveSync({ db: ctx.db, now: OFF_NIGHT });
    expect(status.live).toBe(false);
    expect(status.date).toBe("2026-07-06");
  });

  it("show night: first caller claims and syncs; second is debounced", async () => {
    const { maybeLiveSync } = await import("./maybe-live");
    const fakeClient = {
      async fetchMethod<T>(method: string): Promise<T[]> {
        if (method.startsWith("shows/")) {
          return [{ show_id: 900, showdate: "2026-07-04", permalink: "p", artist_id: 1, showtitle: "",
                    venue_id: 366, tour_id: 0, tourname: "", showorder: 1, show_year: 2026,
                    created_at: "c", updated_at: "u" }] as T[];
        }
        return [] as T[];
      },
    };
    const first = await maybeLiveSync({ db: ctx.db, now: SHOW_NIGHT, client: fakeClient });
    expect(first).toEqual({
      live: true, date: "2026-07-04", claimed: true,
      summary: { shows: 1, performances: 0, deleted: 0 },
    });

    const second = await maybeLiveSync({ db: ctx.db, now: SHOW_NIGHT, client: fakeClient });
    expect(second).toEqual({ live: true, date: "2026-07-04", claimed: false });
  });

  it("never throws even when the sync path fails", async () => {
    const { maybeLiveSync } = await import("./maybe-live");
    const brokenClient = {
      async fetchMethod<T>(): Promise<T[]> { throw new Error("elgoose down"); },
    };
    // Debounced from the previous test → claimed:false without touching the client.
    // Force a fresh claim by rewinding the state row.
    const { sql } = await import("drizzle-orm");
    await ctx.db.execute(sql`update live_sync_state set last_run_at = now() - interval '10 minutes'`);
    const status = await maybeLiveSync({ db: ctx.db, now: SHOW_NIGHT, client: brokenClient });
    expect(status.live).toBe(true);
    expect(status.error).toContain("elgoose down");
  });
});

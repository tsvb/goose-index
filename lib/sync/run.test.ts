import { describe, it, expect, afterAll } from "vitest";
import { makeTestDb } from "../../db/testing";
import * as schema from "../../db/schema";
import { runSync } from "./run";
import type { ElgooseClient } from "../elgoose/types";

const songs = [{ id: 735, name: "California Magic", slug: "california-magic", isoriginal: 1, original_artist: "Goose" },
               { id: 465, name: "Elizabeth", slug: "elizabeth", isoriginal: 1, original_artist: "Goose" }];
const venues = [{ venue_id: 290, venuename: "Radio City Music Hall", city: "New York", state: "NY",
                  country: "USA", zip: null, capacity: 6000, slug: "rcmh" }];
const shows = [{ show_id: 1, showdate: "2022-06-24", permalink: "p", artist_id: 1, showtitle: "",
                 venue_id: 290, tour_id: 29, tourname: "Dripfield Summer Tour 2022", showorder: 1,
                 show_year: 2022, created_at: "x", updated_at: "y" },
               // a non-Goose row that must be filtered out:
               { show_id: 2, showdate: "2022-07-01", permalink: "p2", artist_id: 7, showtitle: "",
                 venue_id: 290, tour_id: 0, tourname: "", showorder: 1, show_year: 2022,
                 created_at: "x", updated_at: "y" }];
const setlists = [{ uniqueid: "12301", show_id: 1, showdate: "2022-06-24", song_id: 735,
                    songname: "California Magic", artist_id: 1, settype: "Set", setnumber: "1",
                    position: 1, tracktime: "8:46", transition_id: 1, transition: ", ", footnote: "",
                    isjamchart: 0, jamchart_notes: null, venue_id: 290,
                    shownotes: "The entire first set was played acoustic.", tour_id: 29,
                    tourname: "Dripfield Summer Tour 2022", showyear: 2022, isverified: 1,
                    isoriginal: 1, original_artist: "", isreprise: 0, isjam: 0 },
                   { uniqueid: "12302", show_id: 1, showdate: "2022-06-24", song_id: 465,
                    songname: "Elizabeth", artist_id: 1, settype: "Set", setnumber: "1",
                    position: 2, tracktime: "5:15", transition_id: 1, transition: ", ", footnote: "",
                    isjamchart: 0, jamchart_notes: null, venue_id: 290,
                    shownotes: "The entire first set was played acoustic.", tour_id: 29,
                    tourname: "Dripfield Summer Tour 2022", showyear: 2022, isverified: 1,
                    isoriginal: 1, original_artist: "", isreprise: 0, isjam: 0 },
                   // song_id 1 ("Foxy Lady") is NOT in `songs` above — must be backfilled from setlists:
                   { uniqueid: "12303", show_id: 1, showdate: "2022-06-24", song_id: 1,
                    songname: "Foxy Lady", slug: "foxy-lady", artist_id: 1, settype: "Encore",
                    setnumber: "E", position: 1, tracktime: "4:00", transition_id: 1, transition: ", ",
                    footnote: "", isjamchart: 0, jamchart_notes: null, venue_id: 290,
                    shownotes: "The entire first set was played acoustic.", tour_id: 29,
                    tourname: "Dripfield Summer Tour 2022", showyear: 2022, isverified: 1,
                    isoriginal: 0, original_artist: "Jimi Hendrix", isreprise: 0, isjam: 0 }];

const fakeClient: ElgooseClient = {
  async fetchMethod<T>(method: string): Promise<T[]> {
    const table: Record<string, unknown[]> = { songs, venues, shows, setlists };
    return (table[method] ?? []) as T[];
  },
};

const ctx = await makeTestDb();
afterAll(() => ctx.close());

describe("runSync", () => {
  it("populates the db, filters to Goose, derives tours + show notes", async () => {
    const summary = await runSync({ client: fakeClient, db: ctx.db });
    expect(summary).toEqual({ venues: 1, tours: 1, songs: 3, shows: 1, performances: 3, removed: [] });

    const showRows = await ctx.db.select().from(schema.shows);
    expect(showRows.length).toBe(1); // artist_id 7 filtered out
    expect(showRows[0].notes).toContain("acoustic");
    expect(showRows[0].tourId).toBe(29);

    const perf = await ctx.db.select().from(schema.performances);
    expect(perf.length).toBe(3);

    // "Foxy Lady" (song_id 1) was absent from `songs` but backfilled from the setlist:
    const foxy = (await ctx.db.select().from(schema.songs)).find((s) => s.songId === 1);
    expect(foxy?.name).toBe("Foxy Lady");
  });

  it("is idempotent on a second run", async () => {
    await runSync({ client: fakeClient, db: ctx.db });
    expect((await ctx.db.select().from(schema.performances)).length).toBe(3);
  });

  it("removes a show elgoose no longer lists, with its performances", async () => {
    // A show we hold (with a setlist row) that elgoose has since withdrawn.
    await ctx.db.insert(schema.shows).values({ showId: 99, showDate: "2026-10-09", artistId: 1 });
    await ctx.db.insert(schema.performances).values({
      uniqueId: "99001", showId: 99, songId: 735, setType: "Set", setNumber: "1", position: 1,
    } as any);
    const summary = await runSync({ client: fakeClient, db: ctx.db });
    expect(summary.removed).toEqual([{ showId: 99, showDate: "2026-10-09" }]);
    const ids = (await ctx.db.select().from(schema.shows)).map((s) => s.showId);
    expect(ids).toEqual([1]);
    expect((await ctx.db.select().from(schema.performances)).length).toBe(3);
  });

  it("refuses to delete when too many shows vanish at once", async () => {
    const extra = Array.from({ length: 6 }, (_, i) => ({ showId: 200 + i, showDate: "2020-01-01", artistId: 1 }));
    await ctx.db.insert(schema.shows).values(extra);
    await expect(runSync({ client: fakeClient, db: ctx.db })).rejects.toThrow(/refusing to delete/);
    // Nothing was deleted.
    expect((await ctx.db.select().from(schema.shows)).length).toBe(7);
  });

  it("refuses to delete when elgoose returns no shows", async () => {
    const empty: ElgooseClient = {
      async fetchMethod<T>(method: string): Promise<T[]> {
        const table: Record<string, unknown[]> = { songs, venues, shows: [], setlists: [] };
        return (table[method] ?? []) as T[];
      },
    };
    await expect(runSync({ client: empty, db: ctx.db })).rejects.toThrow(/returned no shows/);
    expect((await ctx.db.select().from(schema.shows)).length).toBe(7);
  });
});

import { describe, it, expect, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { makeTestDb } from "../../db/testing";
import * as schema from "../../db/schema";
import { runLiveSync } from "./live";
import type { ElgooseClient } from "../elgoose/types";

const DATE = "2026-07-04";

const showRow = {
  show_id: 900, showdate: DATE, permalink: "spac-n2", artist_id: 1, showtitle: "",
  venue_id: 366, venuename: "Saratoga Performing Arts Center", city: "Saratoga Springs",
  state: "NY", country: "USA", tour_id: 44, tourname: "Summer Tour 2026", showorder: 1,
  show_year: 2026, created_at: "c", updated_at: "u",
};

function setlistRow(uniqueid: string, song_id: number, songname: string, position: number, extra: Record<string, unknown> = {}) {
  return {
    uniqueid, show_id: 900, showdate: DATE, song_id, songname, artist_id: 1,
    settype: "Set", setnumber: "1", position, tracktime: "", transition_id: 1,
    transition: ", ", footnote: "", isjamchart: 0, jamchart_notes: null,
    venue_id: 366, venuename: "Saratoga Performing Arts Center",
    shownotes: "", tour_id: 44, tourname: "Summer Tour 2026", showyear: 2026,
    isverified: 0, isoriginal: 1, original_artist: "", isreprise: 0, isjam: 0,
    ...extra,
  };
}

/** Client whose per-method responses can be swapped between calls, mimicking
    the setlist growing (and being corrected) as the show happens. */
function makeFakeClient() {
  const responses: Record<string, unknown[]> = {};
  const calls: string[] = [];
  const client: ElgooseClient = {
    async fetchMethod<T>(method: string): Promise<T[]> {
      calls.push(method);
      return (responses[method] ?? []) as T[];
    },
  };
  return { client, responses, calls };
}

const ctx = await makeTestDb();
afterAll(() => ctx.close());

describe("runLiveSync", () => {
  it("no show on the date → zeros and no setlist fetch", async () => {
    const { client, calls } = makeFakeClient();
    const summary = await runLiveSync({ client, db: ctx.db, date: "2026-01-01" });
    expect(summary).toEqual({ shows: 0, performances: 0, deleted: 0 });
    expect(calls).toEqual(["shows/showdate/2026-01-01"]);
  });

  it("first pull inserts show, venue, missing songs, performances", async () => {
    const { client, responses } = makeFakeClient();
    responses[`shows/showdate/${DATE}`] = [showRow];
    responses[`setlists/showdate/${DATE}`] = [
      setlistRow("l1", 9001, "Borne", 1),
      setlistRow("l2", 9002, "Arcadia", 2, { shownotes: "Fourth of July show." }),
    ];
    const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
    expect(summary).toEqual({ shows: 1, performances: 2, deleted: 0 });

    const show = (await ctx.db.select().from(schema.shows).where(eq(schema.shows.showId, 900)))[0];
    expect(show.showDate).toBe(DATE);
    expect(show.notes).toBe("Fourth of July show.");
    const venue = (await ctx.db.select().from(schema.venues).where(eq(schema.venues.venueId, 366)))[0];
    expect(venue.name).toBe("Saratoga Performing Arts Center");
    const perf = await ctx.db.select().from(schema.performances).where(eq(schema.performances.showId, 900));
    expect(perf.map((p) => p.uniqueId).sort()).toEqual(["l1", "l2"]);
    const song = (await ctx.db.select().from(schema.songs).where(eq(schema.songs.songId, 9001)))[0];
    expect(song.name).toBe("Borne");
  });

  it("second pull mid-show adds new rows and applies upstream corrections", async () => {
    const { client, responses } = makeFakeClient();
    responses[`shows/showdate/${DATE}`] = [showRow];
    responses[`setlists/showdate/${DATE}`] = [
      // l1 corrected (position bumped), l2 REMOVED upstream, l3 new.
      setlistRow("l1", 9001, "Borne", 2),
      setlistRow("l3", 9003, "Hungersite", 3),
    ];
    const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
    expect(summary).toEqual({ shows: 1, performances: 2, deleted: 1 });

    const perf = await ctx.db.select().from(schema.performances).where(eq(schema.performances.showId, 900));
    expect(perf.map((p) => p.uniqueId).sort()).toEqual(["l1", "l3"]);
    expect(perf.find((p) => p.uniqueId === "l1")?.position).toBe(2);
  });

  it("never clobbers catalog data on songs that already exist", async () => {
    const before = (await ctx.db.select().from(schema.songs).where(eq(schema.songs.songId, 9001)))[0];
    const { client, responses } = makeFakeClient();
    responses[`shows/showdate/${DATE}`] = [showRow];
    responses[`setlists/showdate/${DATE}`] = [
      setlistRow("l1", 9001, "borne (typo'd live entry)", 1, { isoriginal: 0, original_artist: "Wrong" }),
    ];
    await runLiveSync({ client, db: ctx.db, date: DATE });
    const after = (await ctx.db.select().from(schema.songs).where(eq(schema.songs.songId, 9001)))[0];
    expect(after).toEqual(before); // insert-only: nightly sync owns song catalog updates
  });

  it("an empty upstream setlist never deletes local rows", async () => {
    const { client, responses } = makeFakeClient();
    responses[`shows/showdate/${DATE}`] = [showRow];
    responses[`setlists/showdate/${DATE}`] = [];
    const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
    expect(summary).toEqual({ shows: 1, performances: 0, deleted: 0 });
    const perf = await ctx.db.select().from(schema.performances).where(eq(schema.performances.showId, 900));
    expect(perf.length).toBe(1); // l1 from the previous test survives
  });

  it("filters non-Goose rows", async () => {
    const { client, responses } = makeFakeClient();
    responses[`shows/showdate/${DATE}`] = [{ ...showRow, show_id: 901, artist_id: 7 }];
    const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
    expect(summary).toEqual({ shows: 0, performances: 0, deleted: 0 });
  });
});

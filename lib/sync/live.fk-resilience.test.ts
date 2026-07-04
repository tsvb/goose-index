import { describe, it, expect, afterAll } from "vitest";
import { eq, sql } from "drizzle-orm";
import { makeTestDb } from "../../db/testing";
import * as schema from "../../db/schema";
import { runLiveSync } from "./live";
import { maybeLiveSync } from "./maybe-live";
import type { ElgooseClient } from "../elgoose/types";

// A live show must NEVER freeze on foreseeable upstream shapes. elgoose serves
// the show list and the setlist from two un-coordinated endpoints, and edits
// them by hand as the night unfolds, so the live sync sees transient states a
// naive FK-ordered write would choke on. These are the two that a prior skeptic
// review found would throw and burn the debounce window (frozen setlist), now
// pinned as the resilient contract: valid rows always land, and the anomaly
// self-heals on a later pull.

const DATE = "2026-07-04";

function showRow(extra: Record<string, unknown> = {}) {
  return {
    show_id: 900, showdate: DATE, permalink: "spac-n2", artist_id: 1, showtitle: "",
    venue_id: 366, venuename: "SPAC", city: "Saratoga Springs",
    state: "NY", country: "USA", tour_id: 44, tourname: "Summer Tour 2026", showorder: 1,
    show_year: 2026, created_at: "c", updated_at: "u",
    ...extra,
  };
}

function setlistRow(uniqueid: string, song_id: number, songname: string, position: number, extra: Record<string, unknown> = {}) {
  return {
    uniqueid, show_id: 900, showdate: DATE, song_id, songname, artist_id: 1,
    settype: "Set", setnumber: "1", position, tracktime: "", transition_id: 1,
    transition: ", ", footnote: "", isjamchart: 0, jamchart_notes: null,
    venue_id: 366, venuename: "SPAC",
    shownotes: "", tour_id: 44, tourname: "Summer Tour 2026", showyear: 2026,
    isverified: 0, isoriginal: 1, original_artist: "", isreprise: 0, isjam: 0,
    ...extra,
  };
}

function makeFakeClient() {
  const responses: Record<string, unknown[]> = {};
  const client: ElgooseClient = {
    async fetchMethod<T>(method: string): Promise<T[]> {
      return (responses[method] ?? []) as T[];
    },
  };
  return { client, responses };
}

describe("runLiveSync: dangling tour_id (blank tourname) never freezes the setlist", () => {
  it("first pull with an unnameable new tour still syncs the show + setlist, tourId left null", async () => {
    const ctx = await makeTestDb();
    try {
      const { client, responses } = makeFakeClient();
      // elgoose assigned tonight a fresh tour_id 77 but hasn't named it yet.
      responses[`shows/showdate/${DATE}`] = [showRow({ tour_id: 77, tourname: "" })];
      responses[`setlists/showdate/${DATE}`] = [
        setlistRow("l1", 9001, "Borne", 1, { tour_id: 77, tourname: "" }),
      ];

      const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(summary).toEqual({ shows: 1, performances: 1, deleted: 0 });

      const show = (await ctx.db.select().from(schema.shows).where(eq(schema.shows.showId, 900)))[0];
      expect(show.tourId).toBeNull(); // unresolvable tour → dropped, not a dangling FK
      const perf = await ctx.db.select().from(schema.performances).where(eq(schema.performances.showId, 900));
      expect(perf.map((p) => p.uniqueId)).toEqual(["l1"]);
    } finally { await ctx.close(); }
  });

  it("links the tour once upstream names it on a later pull", async () => {
    const ctx = await makeTestDb();
    try {
      const { client, responses } = makeFakeClient();
      responses[`shows/showdate/${DATE}`] = [showRow({ tour_id: 77, tourname: "" })];
      responses[`setlists/showdate/${DATE}`] = [setlistRow("l1", 9001, "Borne", 1, { tour_id: 77, tourname: "" })];
      await runLiveSync({ client, db: ctx.db, date: DATE });

      // Upstream fills in the name.
      responses[`shows/showdate/${DATE}`] = [showRow({ tour_id: 77, tourname: "Fall Tour 2026" })];
      responses[`setlists/showdate/${DATE}`] = [setlistRow("l1", 9001, "Borne", 1, { tour_id: 77, tourname: "Fall Tour 2026" })];
      const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(summary.shows).toBe(1);

      const show = (await ctx.db.select().from(schema.shows).where(eq(schema.shows.showId, 900)))[0];
      expect(show.tourId).toBe(77);
      const tour = (await ctx.db.select().from(schema.tours).where(eq(schema.tours.tourId, 77)))[0];
      expect(tour.name).toBe("Fall Tour 2026");
    } finally { await ctx.close(); }
  });

  it("mid-show tour reassignment on an already-synced show keeps new songs flowing", async () => {
    const ctx = await makeTestDb();
    try {
      const { client, responses } = makeFakeClient();
      // Pull 1: normal, tour 44 named.
      responses[`shows/showdate/${DATE}`] = [showRow()];
      responses[`setlists/showdate/${DATE}`] = [setlistRow("l1", 9001, "Borne", 1)];
      const ok = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(ok.shows).toBe(1);

      // Pull 2: elgoose reassigns to a new, still-unnamed tour 78 and adds a song.
      responses[`shows/showdate/${DATE}`] = [showRow({ tour_id: 78, tourname: "" })];
      responses[`setlists/showdate/${DATE}`] = [
        setlistRow("l1", 9001, "Borne", 1, { tour_id: 78, tourname: "" }),
        setlistRow("l2", 9002, "Arcadia", 2, { tour_id: 78, tourname: "" }),
      ];
      const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(summary.performances).toBe(2);

      const perf = await ctx.db.select().from(schema.performances).where(eq(schema.performances.showId, 900));
      expect(perf.map((p) => p.uniqueId).sort()).toEqual(["l1", "l2"]); // new song landed
      const show = (await ctx.db.select().from(schema.shows).where(eq(schema.shows.showId, 900)))[0];
      expect(show.tourId).toBeNull(); // reassigned-but-unnamed tour → dropped, still known tour 44 row untouched
    } finally { await ctx.close(); }
  });
});

describe("runLiveSync: a setlist row for a show missing from the shows fetch", () => {
  it("skips the orphan rows but still writes the known show's setlist", async () => {
    const ctx = await makeTestDb();
    try {
      const { client, responses } = makeFakeClient();
      // Show 901 was added upstream between the shows fetch and the setlist
      // fetch, so its rows arrive with no show row.
      responses[`shows/showdate/${DATE}`] = [showRow()];
      responses[`setlists/showdate/${DATE}`] = [
        setlistRow("l1", 9001, "Borne", 1),
        setlistRow("x1", 9002, "Madhuvan", 1, { show_id: 901 }),
      ];
      const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(summary.performances).toBe(1); // only the known show's row counted

      const perf = await ctx.db.select().from(schema.performances);
      expect(perf.map((p) => p.uniqueId)).toEqual(["l1"]);
      const orphanShow = await ctx.db.select().from(schema.shows).where(eq(schema.shows.showId, 901));
      expect(orphanShow.length).toBe(0);
    } finally { await ctx.close(); }
  });

  it("lands the previously-orphaned rows once the show appears in a later pull", async () => {
    const ctx = await makeTestDb();
    try {
      const { client, responses } = makeFakeClient();
      responses[`shows/showdate/${DATE}`] = [showRow()];
      responses[`setlists/showdate/${DATE}`] = [
        setlistRow("l1", 9001, "Borne", 1),
        setlistRow("x1", 9002, "Madhuvan", 1, { show_id: 901 }),
      ];
      await runLiveSync({ client, db: ctx.db, date: DATE });

      // Next pull: the shows fetch now includes 901.
      responses[`shows/showdate/${DATE}`] = [showRow(), showRow({ show_id: 901, showorder: 2, permalink: "spac-n2b" })];
      const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(summary.performances).toBe(2);

      const perf = await ctx.db.select().from(schema.performances);
      expect(perf.map((p) => p.uniqueId).sort()).toEqual(["l1", "x1"]);
    } finally { await ctx.close(); }
  });
});

describe("runLiveSync: multi-show nights and duplicate rows never crash or wipe", () => {
  it("two same-date shows at one brand-new venue insert once (no ON CONFLICT crash)", async () => {
    const ctx = await makeTestDb();
    try {
      const { client, responses } = makeFakeClient();
      // Festival/two-show day: both shows reference the same not-yet-cataloged venue.
      responses[`shows/showdate/${DATE}`] = [
        showRow({ show_id: 900, showorder: 1, venue_id: 500, venuename: "New Grounds" }),
        showRow({ show_id: 901, showorder: 2, venue_id: 500, venuename: "New Grounds", permalink: "ng-2" }),
      ];
      responses[`setlists/showdate/${DATE}`] = [
        setlistRow("a1", 9001, "Borne", 1, { show_id: 900, venue_id: 500 }),
        setlistRow("b1", 9002, "Arcadia", 1, { show_id: 901, venue_id: 500 }),
      ];
      const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(summary.shows).toBe(2);
      expect(summary.performances).toBe(2);

      const venues = await ctx.db.select().from(schema.venues).where(eq(schema.venues.venueId, 500));
      expect(venues.length).toBe(1);
    } finally { await ctx.close(); }
  });

  it("a pull returning only one show's setlist never deletes the sibling show's rows", async () => {
    const ctx = await makeTestDb();
    try {
      const { client, responses } = makeFakeClient();
      // Both shows synced with a song each.
      responses[`shows/showdate/${DATE}`] = [
        showRow({ show_id: 900, showorder: 1 }),
        showRow({ show_id: 901, showorder: 2, permalink: "spac-2" }),
      ];
      responses[`setlists/showdate/${DATE}`] = [
        setlistRow("a1", 9001, "Borne", 1, { show_id: 900 }),
        setlistRow("b1", 9002, "Arcadia", 1, { show_id: 901 }),
      ];
      await runLiveSync({ client, db: ctx.db, date: DATE });

      // Next pull: shows fetch returns BOTH, but the setlist fetch transiently
      // returns only show 900's rows (mid-edit). Show 901 must not be wiped.
      responses[`setlists/showdate/${DATE}`] = [setlistRow("a1", 9001, "Borne", 1, { show_id: 900 })];
      const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(summary.deleted).toBe(0);

      const b = await ctx.db.select().from(schema.performances).where(eq(schema.performances.showId, 901));
      expect(b.map((p) => p.uniqueId)).toEqual(["b1"]); // preserved
    } finally { await ctx.close(); }
  });

  it("still corrects a show that DID return rows this pull", async () => {
    const ctx = await makeTestDb();
    try {
      const { client, responses } = makeFakeClient();
      responses[`shows/showdate/${DATE}`] = [showRow()];
      responses[`setlists/showdate/${DATE}`] = [
        setlistRow("l1", 9001, "Borne", 1),
        setlistRow("l2", 9002, "Arcadia", 2),
      ];
      await runLiveSync({ client, db: ctx.db, date: DATE });

      // l2 removed upstream on the next pull → should be deleted.
      responses[`setlists/showdate/${DATE}`] = [setlistRow("l1", 9001, "Borne", 1)];
      const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(summary.deleted).toBe(1);
      const perf = await ctx.db.select().from(schema.performances).where(eq(schema.performances.showId, 900));
      expect(perf.map((p) => p.uniqueId)).toEqual(["l1"]);
    } finally { await ctx.close(); }
  });

  it("a duplicate uniqueid within one pull collapses to one row (no ON CONFLICT crash)", async () => {
    const ctx = await makeTestDb();
    try {
      const { client, responses } = makeFakeClient();
      responses[`shows/showdate/${DATE}`] = [showRow()];
      responses[`setlists/showdate/${DATE}`] = [
        setlistRow("dup", 9001, "Borne", 1),
        setlistRow("dup", 9001, "Borne", 2), // same uniqueid, corrected position
      ];
      const summary = await runLiveSync({ client, db: ctx.db, date: DATE });
      expect(summary.performances).toBe(1);
      const perf = await ctx.db.select().from(schema.performances).where(eq(schema.performances.uniqueId, "dup"));
      expect(perf.length).toBe(1);
      expect(perf[0].position).toBe(2); // last row wins
    } finally { await ctx.close(); }
  });
});

describe("maybeLiveSync: a dangling-tour night succeeds instead of burning the window", () => {
  it("returns a real summary (claimed, no error) so the setlist actually updates", async () => {
    const ctx = await makeTestDb();
    try {
      // 8pm ET on the 4th = 2026-07-05T00:00Z.
      const now = new Date("2026-07-05T00:00:00Z");
      await ctx.db.insert(schema.artists).values({ artistId: 1, name: "Goose" });
      await ctx.db.insert(schema.venues).values({ venueId: 366, name: "SPAC", slug: null, city: null, state: null, country: null, zip: null, capacity: null });
      await ctx.db.insert(schema.shows).values({
        showId: 900, showDate: DATE, artistId: 1, venueId: 366, tourId: null,
        title: null, permalink: "p", showOrder: 1, notes: null, createdAt: null, updatedAt: null,
      });

      const { client, responses } = makeFakeClient();
      responses[`shows/showdate/${DATE}`] = [showRow({ tour_id: 77, tourname: "" })];
      responses[`setlists/showdate/${DATE}`] = [setlistRow("l1", 9001, "Borne", 1, { tour_id: 77, tourname: "" })];

      const r = await maybeLiveSync({ db: ctx.db, now, client });
      expect(r.live).toBe(true);
      expect(r.error).toBeUndefined();
      expect(r.claimed).toBe(true);
      expect(r.summary).toEqual({ shows: 1, performances: 1, deleted: 0 });
    } finally { await ctx.close(); }
  });
});

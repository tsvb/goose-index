import { describe, it, expect, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { makeTestDb } from "./testing";
import * as schema from "./schema";

const ctx = await makeTestDb();
afterAll(() => ctx.close());

describe("schema migrates into PGlite", () => {
  it("can insert and read an artist", async () => {
    await ctx.db.insert(schema.artists).values({ artistId: 1, name: "Goose" });
    const rows = await ctx.db.select().from(schema.artists);
    expect(rows).toEqual([{ artistId: 1, name: "Goose" }]);
  });

  it("has all six tables", async () => {
    const res: any = await ctx.db.execute(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`
    );
    const names = (res.rows ?? res).map((r: any) => r.table_name);
    for (const t of ["artists", "performances", "shows", "songs", "tours", "venues"]) {
      expect(names).toContain(t);
    }
  });
});

describe("nugs container storage", () => {
  it("stores a container and resolves it onto a show", async () => {
    await ctx.db.insert(schema.nugsContainers).values({
      containerId: 46887,
      performanceDate: "2026-08-16",
      venueName: "Grand Theatre at Grand Sierra Resort",
      venueCity: "Reno",
      venueState: "NV",
      hasVideo: false,
    });
    const rows = await ctx.db.select().from(schema.nugsContainers);
    expect(rows).toHaveLength(1);
    expect(rows[0].containerId).toBe(46887);
    expect(rows[0].hasVideo).toBe(false);
  });

  it("shows carry a nullable resolved container", async () => {
    await ctx.db.insert(schema.artists).values({ artistId: 1205, name: "Goose (nugs test)" });
    await ctx.db.insert(schema.shows).values({
      showId: 90001, showDate: "2026-08-16", artistId: 1205,
      nugsContainerId: 46887, nugsHasVideo: true,
    });
    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId, video: schema.shows.nugsHasVideo })
      .from(schema.shows)
      .where(sql`${schema.shows.showId} = 90001`);
    expect(row).toEqual({ id: 46887, video: true });
  });
});

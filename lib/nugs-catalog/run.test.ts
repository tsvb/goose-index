import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { makeTestDb } from "../../db/testing";
import * as schema from "../../db/schema";
import { runNugsImport } from "./run";
import type { NugsContainer } from "./parse";

const ctx = await makeTestDb();
afterAll(() => ctx.close());

const container = (
  containerId: number, performanceDate: string, venueName: string | null, hasVideo = false,
): NugsContainer => ({ containerId, performanceDate, venueName, venueCity: null, venueState: null, hasVideo });

const clientOf = (rows: NugsContainer[]) => ({ fetchAllContainers: async () => rows });

async function seedShow(showId: number, showDate: string, venueName: string | null) {
  if (venueName) {
    await ctx.db.insert(schema.venues).values({ venueId: showId, name: venueName }).onConflictDoNothing();
  }
  await ctx.db.insert(schema.shows).values({
    showId, showDate, artistId: 1205, venueId: venueName ? showId : null,
  });
}

beforeEach(async () => {
  await ctx.db.execute(sql`delete from shows`);
  await ctx.db.execute(sql`delete from venues`);
  await ctx.db.execute(sql`delete from nugs_containers`);
  await ctx.db.insert(schema.artists).values({ artistId: 1205, name: "Goose" }).onConflictDoNothing();
});

describe("runNugsImport", () => {
  it("stores containers and resolves them onto shows", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed, Chicago");
    const summary = await runNugsImport({
      client: clientOf([container(46887, "2024-04-20", "The Salt Shed", true)]),
      db: ctx.db,
    });

    expect(summary).toMatchObject({ fetched: 1, stored: 1, matched: 1, unmatched: 0, dryRun: false });
    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId, video: schema.shows.nugsHasVideo })
      .from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row).toEqual({ id: 46887, video: true });
  });

  it("leaves an unresolvable two-show day null", async () => {
    await seedShow(1, "2022-07-22", null);
    const summary = await runNugsImport({
      client: clientOf([
        container(10, "2022-07-22", "Stage AE"),
        container(11, "2022-07-22", "Petersen Events Center"),
      ]),
      db: ctx.db,
    });

    expect(summary.matched).toBe(0);
    expect(summary.unmatched).toBe(1);
    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row.id).toBeNull();
  });

  it("is idempotent and updates a container that changed", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    await runNugsImport({ client: clientOf([container(46887, "2024-04-20", "Old Name")]), db: ctx.db });
    await runNugsImport({ client: clientOf([container(46887, "2024-04-20", "The Salt Shed", true)]), db: ctx.db });

    const rows = await ctx.db.select().from(schema.nugsContainers);
    expect(rows).toHaveLength(1);
    expect(rows[0].venueName).toBe("The Salt Shed");
    expect(rows[0].hasVideo).toBe(true);
  });

  it("clears a stale resolution when the container is gone from the catalog", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    await runNugsImport({ client: clientOf([container(46887, "2024-04-20", "The Salt Shed")]), db: ctx.db });
    await runNugsImport({ client: clientOf([container(1, "2019-01-01", "Elsewhere")]), db: ctx.db });

    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row.id).toBeNull();
  });

  it("writes nothing on a dry run", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    const summary = await runNugsImport({
      client: clientOf([container(46887, "2024-04-20", "The Salt Shed")]),
      db: ctx.db, dryRun: true,
    });

    expect(summary).toMatchObject({ matched: 1, dryRun: true });
    expect(await ctx.db.select().from(schema.nugsContainers)).toEqual([]);
    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row.id).toBeNull();
  });

  it("writes nothing when the fetch fails", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    const failing = { fetchAllContainers: async () => { throw new Error("HTTP 503"); } };
    await expect(runNugsImport({ client: failing, db: ctx.db })).rejects.toThrow(/503/);
    expect(await ctx.db.select().from(schema.nugsContainers)).toEqual([]);
  });
});

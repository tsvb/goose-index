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
    await runNugsImport({
      client: clientOf([container(46887, "2024-04-20", "The Salt Shed", true)]),
      db: ctx.db,
    });

    const failing = { fetchAllContainers: async () => { throw new Error("HTTP 503"); } };
    await expect(runNugsImport({ client: failing, db: ctx.db })).rejects.toThrow(/503/);

    const containerRows = await ctx.db.select().from(schema.nugsContainers);
    expect(containerRows).toHaveLength(1);
    expect(containerRows[0]).toMatchObject({ containerId: 46887, venueName: "The Salt Shed" });

    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row.id).toBe(46887);
  });

  it("throws on a catalog fetch that returns zero containers, leaving resolution untouched", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    await runNugsImport({
      client: clientOf([container(46887, "2024-04-20", "The Salt Shed", true)]),
      db: ctx.db,
    });

    await expect(runNugsImport({ client: clientOf([]), db: ctx.db }))
      .rejects.toThrow(/zero containers/);

    // Neither the containers table nor the show's resolution was blanked.
    const containerRows = await ctx.db.select().from(schema.nugsContainers);
    expect(containerRows).toHaveLength(1);
    expect(containerRows[0]).toMatchObject({ containerId: 46887, venueName: "The Salt Shed" });

    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row.id).toBe(46887);
  });

  it("rolls back the container upsert when a show update fails mid-transaction", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    await seedShow(2, "2024-05-01", "Bimbo's 365 Club");

    // First run resolves only show 1; show 2 has no matching container yet.
    await runNugsImport({
      client: clientOf([container(10, "2024-04-20", "The Salt Shed")]),
      db: ctx.db,
    });

    // A CHECK constraint stands in for "one show's update fails mid-write":
    // show 2 is only allowed a null container, so the second run's update of
    // show 2 aborts the transaction after the container upsert (which renames
    // container 10 and inserts containers 11/20) has already run inside it.
    await ctx.db.execute(sql`
      alter table shows add constraint ck_test_block_show2_container
      check (show_id <> 2 or nugs_container_id is null)
    `);
    try {
      await expect(runNugsImport({
        client: clientOf([
          container(11, "2024-04-20", "The Salt Shed, Renamed"),
          container(20, "2024-05-01", "Bimbos 365 Club"),
        ]),
        db: ctx.db,
      })).rejects.toThrow(/constraint/i);
    } finally {
      await ctx.db.execute(sql`alter table shows drop constraint ck_test_block_show2_container`);
    }

    // Nothing from the failed second run survives: the container upsert
    // (rename of 10, plus new rows 11 and 20) rolled back along with the
    // show updates.
    const containerRows = await ctx.db.select().from(schema.nugsContainers);
    expect(containerRows).toHaveLength(1);
    expect(containerRows[0]).toMatchObject({ containerId: 10, venueName: "The Salt Shed" });

    const [show1] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(show1.id).toBe(10);

    const [show2] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 2`);
    expect(show2.id).toBeNull();
  });
});

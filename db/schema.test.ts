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

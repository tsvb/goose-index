import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import type { AppDb } from "./schema";

export async function makeTestDb(): Promise<{ db: AppDb; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db as any, { migrationsFolder: "./drizzle" });
  return { db: db as unknown as AppDb, close: () => client.close() };
}

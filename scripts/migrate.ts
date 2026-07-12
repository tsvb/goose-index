import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { shouldSkipMigrations } from "./migrate-gate";

// The production build migrates; a preview build must not, because previews
// share the production database. See migrate-gate.ts.
if (shouldSkipMigrations(process.env)) {
  console.log(`skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV})`);
  process.exit(0);
}

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

// Required against Neon's pooled endpoint: PgBouncer in transaction mode does
// not support prepared statements. Harmless on a direct or local connection.
const sql = postgres(url, { max: 1, prepare: false });
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
await sql.end();
console.log("migrations applied");

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { shouldSkipMigrations } from "./migrate-gate";
import { announceTarget } from "./target";
import { databaseUrl } from "../db/url";

// The production build migrates; a preview build must not, because previews
// share the production database. See migrate-gate.ts.
if (shouldSkipMigrations(process.env)) {
  console.log(`skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV})`);
  process.exit(0);
}

const url = databaseUrl();
if (!url) throw new Error("DATABASE_URL is not set");
announceTarget(url);

// Required against a transaction-mode pooler (Supabase's Supavisor, Neon's
// PgBouncer): prepared statements are not supported there. Harmless on a
// direct or local connection.
const sql = postgres(url, { max: 1, prepare: false });
await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
await sql.end();
console.log("migrations applied");

import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// Preview deployments share the production database, so a build for one must
// never alter the schema — otherwise pushing any branch would migrate prod
// before the change is reviewed. Only the production build may migrate.
// Off Vercel (local, GitHub Actions) VERCEL is unset and this is inert.
if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
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

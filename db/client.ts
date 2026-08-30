import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import { databaseUrl } from "./url";

function connect(connectionString: string) {
  const client = postgres(connectionString, {
    // Supabase's pooled endpoint (Supavisor, like Neon's PgBouncer before it)
    // runs in transaction mode, which does not support prepared statements —
    // disabling them is required there and is harmless against a plain local
    // Postgres.
    prepare: false,
    // NOT max: 1. postgres.js pipelines queued queries onto one connection
    // (up to max_pipeline: 100), and Supavisor in transaction mode can
    // deadlock on a pipelined batch — porsager/postgres#970. A page's
    // Promise.all of five reads over a single connection is exactly that
    // batch: on Neon's PgBouncer it worked, on Supabase the first sitemap
    // build hung 60s ×3 and killed the deploy. The driver default (10) gives
    // concurrent queries their own pooled connections instead; idle_timeout
    // below returns them within seconds of a burst.
    max: 10,
    // A warm Vercel isolate reuses this module. Without an idle timeout the
    // TCP session stays open and never lets the database go idle — on a
    // compute-billed platform that's "the database is always on".
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    connect_timeout: 10,
  });
  return { client, db: drizzle(client, { schema }) };
}

type Connection = ReturnType<typeof connect>;
type Db = Connection["db"];

let connection: Connection | undefined;

function init(): Connection {
  if (!connection) {
    const connectionString = databaseUrl();
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    connection = connect(connectionString);
  }
  return connection;
}

// `db` is importable eagerly but connects lazily on first use: `next build`
// evaluates route modules (which pull this file into the graph), and that must
// not require DATABASE_URL or open a socket until an actual query runs. Methods
// are bound to the real Drizzle instance so its internals work through the proxy.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = init().db as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export const closeDb = () => connection?.client.end();

import "dotenv/config";
import { db, closeDb } from "../db/client";
import type { AppDb } from "../db/schema";
import { auditAgainstSource, type SourceShow } from "../lib/verify/source";
import { announceTarget } from "./target";

/**
 * Check the cache against elgoose, the source of truth.
 *
 * Read-only — it makes no writes and can be run against production safely.
 * `verify` checks the database against itself; this checks it against the
 * original, which is the only way to answer "are the tours right?" without a
 * one-off script and a pair of eyes.
 *
 *   npm run audit-source
 */

const BASE = process.env.ELGOOSE_BASE ?? "https://elgoose.net/api/v2";
const UA =
  process.env.ELGOOSE_USER_AGENT ?? "GooseIndex/1.0 (+https://github.com/tsvb/goose-index; source audit)";

async function fetchShows(): Promise<SourceShow[]> {
  const res = await fetch(`${BASE}/shows.json?limit=5000`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`elgoose returned HTTP ${res.status}`);
  const body = (await res.json()) as { data?: SourceShow[] };
  const data = body.data ?? [];
  if (data.length === 0) throw new Error("elgoose returned no shows — refusing to report agreement");
  return data;
}

announceTarget(process.env.DATABASE_URL ?? "", { readOnly: true });

const results = await auditAgainstSource({ db: db as unknown as AppDb, fetchShows });
for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name} — ${r.detail}`);

await closeDb();
const ok = results.every((r) => r.pass);
console.log(ok ? "\nSOURCE AUDIT OK" : "\nSOURCE AUDIT FAILED");
if (!ok) process.exit(1);

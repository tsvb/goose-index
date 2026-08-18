import "dotenv/config";
import { createNugsCatalogClient } from "../lib/nugs-catalog/client";
import { runNugsImport } from "../lib/nugs-catalog/run";
import { db, closeDb } from "../db/client";
import type { AppDb } from "../db/schema";
import { announceTarget } from "./target";

/**
 * Imports nugs's Goose catalog into `nugs_containers` and resolves one container
 * per show onto `shows.nugs_container_id`.
 *
 * `.env` DATABASE_URL is PRODUCTION. Trust the target line printed below.
 *
 * Usage:
 *   npm run import-nugs -- --dry-run
 *   npm run import-nugs
 */
announceTarget(process.env.DATABASE_URL ?? "");

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const ua = process.env.NUGS_USER_AGENT;
  const client = createNugsCatalogClient(ua ? { userAgent: ua } : {});
  const summary = await runNugsImport({ client, db: db as unknown as AppDb, dryRun });
  console.log("nugs import complete:", summary);
  await closeDb();
}

main().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });

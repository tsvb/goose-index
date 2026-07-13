import "dotenv/config";
import { createElgooseClient } from "../lib/elgoose/client";
import { runSync } from "../lib/sync/run";
import { db, closeDb } from "../db/client";
import type { AppDb } from "../db/schema";
import { announceTarget } from "./target";

// db/client pulls in dotenv, so the env is loaded by the time this runs.
announceTarget(process.env.DATABASE_URL ?? "");

async function main() {
  const ua = process.env.ELGOOSE_USER_AGENT;
  const client = createElgooseClient(ua ? { userAgent: ua } : {});
  const summary = await runSync({ client, db: db as unknown as AppDb });
  console.log("sync complete:", summary);
  await closeDb();
}

main().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });

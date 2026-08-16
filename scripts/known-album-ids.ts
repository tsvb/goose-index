// Dump the album_ids already sitting in the `albums` table, so the Bandcamp
// scraper can skip re-fetching pages it has already parsed and the importers
// only ever see what's new — instead of re-scraping and re-upserting the
// full ~500-release catalog every month.
//
// Read-only.
//
// Usage:
//   tsx scripts/known-album-ids.ts <out-file>

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { db, closeDb } from "@/db/client";
import { albums } from "@/db/schema";
import { announceTarget } from "./target";

const outPath = process.argv[2];
if (!outPath) {
  console.error("usage: tsx scripts/known-album-ids.ts <out-file>");
  process.exit(1);
}

announceTarget(process.env.DATABASE_URL ?? "", { readOnly: true });

const rows = await db.select({ albumId: albums.albumId }).from(albums);

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, rows.map((r) => r.albumId).join("\n") + (rows.length ? "\n" : ""), "utf8");
console.log(`wrote ${rows.length} known album id(s) to ${outPath}`);

await closeDb();

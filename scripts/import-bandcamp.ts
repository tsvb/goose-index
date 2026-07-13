// Import bandcamp album data into the shows table.
//
// Pipeline:
//   1. Run scripts/scrape_bandcamp.py to produce data/albums.jsonl
//      (~10 min for a full run against goosetheband.bandcamp.com)
//   2. Run this script to upsert the bandcamp columns on matching shows.
//
// Usage:
//   tsx scripts/import-bandcamp.ts data/albums.jsonl
//   tsx scripts/import-bandcamp.ts data/albums.jsonl --dry-run
//
// Matching rule: by show_date. When multiple shows share a date the album's
// slug is inspected for a trailing "-N" that maps to shows.show_order; a
// bare slug binds to show_order = 1 (or the sole show if there's only one).

import fs from "node:fs";
import path from "node:path";
import { db, closeDb } from "@/db/client";
import { shows } from "@/db/schema";
import { eq } from "drizzle-orm";
import { announceTarget } from "./target";

// db/client pulls in dotenv, so the env is loaded by the time this runs.
announceTarget(process.env.DATABASE_URL ?? "");

type Album = {
  album_id: number;
  slug: string;
  url: string;
  title: string;
  is_live: boolean;
  show_date: string | null;
  notes_raw: string | null;
};

/** Slug convention for multi-show days: "…-uk-2" → the second show that day. */
function slugShowOrder(slug: string): number | null {
  const m = slug.match(/-(\d+)$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  // Guard against slugs that end in a year or an unrelated number by capping
  // the plausible show_order at 6 — Goose has never played more than that in
  // a day. Anything larger is almost certainly not an order suffix.
  return n >= 1 && n <= 6 ? n : null;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const jsonlPath = args.find((a) => !a.startsWith("--"));
  if (!jsonlPath) {
    console.error("usage: tsx scripts/import-bandcamp.ts <path-to-albums.jsonl> [--dry-run]");
    process.exit(1);
  }
  const absPath = path.resolve(jsonlPath);
  if (!fs.existsSync(absPath)) {
    console.error(`file not found: ${absPath}`);
    process.exit(1);
  }

  const albums: Album[] = fs
    .readFileSync(absPath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Album);

  const live = albums.filter((a): a is Album & { show_date: string; notes_raw: string } =>
    Boolean(a.is_live && a.show_date && a.notes_raw),
  );
  console.log(`read ${albums.length} albums; ${live.length} live w/ notes_raw`);

  let updated = 0;
  let noShowMatch = 0;
  let multiShowFallback = 0;
  const unmatched: string[] = [];

  for (const a of live) {
    const wantedOrder = slugShowOrder(a.slug);
    const rows = await db
      .select({ showId: shows.showId, showOrder: shows.showOrder })
      .from(shows)
      .where(eq(shows.showDate, a.show_date));

    if (rows.length === 0) {
      noShowMatch++;
      unmatched.push(`${a.show_date}  ${a.slug}`);
      continue;
    }

    let target: { showId: number; showOrder: number | null } | undefined;
    if (rows.length === 1) {
      target = rows[0];
    } else if (wantedOrder != null) {
      target = rows.find((r) => r.showOrder === wantedOrder);
      if (!target) {
        // scraper says show 2, but DB has no show_order=2 for that date
        target = rows[0];
        multiShowFallback++;
      }
    } else {
      // multiple shows same date, slug has no suffix — bind to show_order=1 or first
      target = rows.find((r) => r.showOrder === 1) ?? rows[0];
      multiShowFallback++;
    }
    if (!target) continue;

    if (!dryRun) {
      await db
        .update(shows)
        .set({
          bandcampAlbumId: String(a.album_id),
          bandcampUrl: a.url,
          coachNotes: a.notes_raw,
        })
        .where(eq(shows.showId, target.showId));
    }
    updated++;
    if (updated % 50 === 0) console.log(`  ...${updated} shows updated`);
  }

  console.log(
    `\ndone. updated=${updated} no_show_match=${noShowMatch} ` +
      `multi_show_ambiguous=${multiShowFallback}${dryRun ? "  (DRY RUN — no writes)" : ""}`,
  );
  if (noShowMatch > 0) {
    console.log(`\n--- first 20 unmatched bandcamp releases (not in shows) ---`);
    for (const line of unmatched.slice(0, 20)) console.log(`  ${line}`);
    if (unmatched.length > 20) console.log(`  ...and ${unmatched.length - 20} more`);
  }
  await closeDb();
}

main().catch(async (err) => {
  console.error(err);
  await closeDb();
  process.exit(1);
});

import { eq, sql } from "drizzle-orm";
import type { AppDb } from "../../db/schema";
import { nugsContainers, shows, venues } from "../../db/schema";
import type { NugsCatalogClient } from "./client";
import { resolveContainer } from "./match";

export type NugsImportSummary = {
  fetched: number;
  stored: number;
  matched: number;
  unmatched: number;
  dryRun: boolean;
};

/** Fetch the whole catalog, store it, then resolve one container per show.
 *
 *  The fetch completes before anything is written, so a failed or partial fetch
 *  throws with the previous data untouched — a nugs outage must not blank the
 *  table. Resolution is recomputed from scratch each run, which is also what
 *  clears a show whose container has left the catalog. */
export async function runNugsImport(deps: {
  client: NugsCatalogClient;
  db: AppDb;
  now?: Date;
  dryRun?: boolean;
}): Promise<NugsImportSummary> {
  const { client, db } = deps;
  const dryRun = deps.dryRun === true;
  const fetchedAt = deps.now ?? new Date();

  const containers = await client.fetchAllContainers();
  // A 200 with a changed JSON shape (or a new auth wall) parses to zero rows
  // just like a truly empty catalog would — but an empty Goose catalog is
  // impossible (485 real containers existed on 2026-08-18). Blanking every
  // show's resolution on a green exit is the exact failure mode this guards
  // against; throw before any write, dry-run summary included.
  if (containers.length === 0) {
    throw new Error(
      "nugs catalog returned zero containers — refusing to blank every show's resolution (shape change or auth wall?)",
    );
  }

  const showRows = await db
    .select({ showId: shows.showId, date: shows.showDate, venue: venues.name })
    .from(shows)
    .leftJoin(venues, eq(venues.venueId, shows.venueId));

  const resolutions = showRows.map((s) => ({
    showId: s.showId,
    container: resolveContainer({ date: s.date, venue: s.venue }, containers),
  }));
  const matched = resolutions.filter((r) => r.container != null).length;

  const summary: NugsImportSummary = {
    fetched: containers.length,
    stored: dryRun ? 0 : containers.length,
    matched,
    unmatched: resolutions.length - matched,
    dryRun,
  };
  if (dryRun) return summary;

  // The container upsert and the per-show update loop must land together: a
  // process death partway through the loop must not leave some shows resolved
  // against the freshly fetched catalog while the rest (and the containers
  // table itself) still reflect the previous run.
  await db.transaction(async (tx) => {
    if (containers.length > 0) {
      await tx.insert(nugsContainers)
        .values(containers.map((c) => ({ ...c, fetchedAt })))
        .onConflictDoUpdate({
          target: nugsContainers.containerId,
          set: {
            performanceDate: sql`excluded.performance_date`,
            venueName: sql`excluded.venue_name`,
            venueCity: sql`excluded.venue_city`,
            venueState: sql`excluded.venue_state`,
            hasVideo: sql`excluded.has_video`,
            fetchedAt: sql`excluded.fetched_at`,
          },
        });
    }

    // Recomputed every run, so a show that stops resolving is cleared.
    for (const r of resolutions) {
      await tx.update(shows)
        .set({
          nugsContainerId: r.container?.containerId ?? null,
          nugsHasVideo: r.container?.hasVideo ?? null,
        })
        .where(eq(shows.showId, r.showId));
    }
  });

  return summary;
}

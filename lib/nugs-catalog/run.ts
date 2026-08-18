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

  if (containers.length > 0) {
    await db.insert(nugsContainers)
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
    await db.update(shows)
      .set({
        nugsContainerId: r.container?.containerId ?? null,
        nugsHasVideo: r.container?.hasVideo ?? null,
      })
      .where(eq(shows.showId, r.showId));
  }

  return summary;
}

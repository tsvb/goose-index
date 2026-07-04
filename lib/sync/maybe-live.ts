import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import type { AppDb } from "@/db/schema";
import { createElgooseClient } from "@/lib/elgoose/client";
import type { ElgooseClient } from "@/lib/elgoose/types";
import { liveCandidateDate } from "@/lib/live";
import { runLiveSync, type LiveSyncSummary } from "./live";

export interface LiveStatus {
  live: boolean;
  date?: string;
  claimed?: boolean;
  summary?: LiveSyncSummary;
  error?: string;
}

/** Minimum seconds between elgoose pulls, no matter how many visitors. */
const DEBOUNCE_SECONDS = 60;

function claimRows(result: unknown): unknown[] {
  return Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
}

/**
 * Refresh tonight's setlist if — and only if — a show could be live right now.
 * Called from show-page renders (fire-and-forget via `after()`) and the
 * /api/live endpoint, so freshness is visitor-driven: while anyone watches,
 * the page keeps re-syncing itself; when nobody does, nothing runs.
 *
 * Concurrency: a single-row atomic claim on live_sync_state.last_run_at lets
 * exactly one caller per DEBOUNCE_SECONDS window do the elgoose pull; everyone
 * else returns immediately. A crash after a claim just skips one window.
 * Never throws — a failed live refresh must never take down a page render.
 */
export async function maybeLiveSync(deps?: { db?: AppDb; now?: Date; client?: ElgooseClient }): Promise<LiveStatus> {
  const d = (deps?.db ?? db) as AppDb;
  const date = liveCandidateDate(deps?.now ?? new Date());
  if (!date) return { live: false };
  try {
    // Only sync dates we know have a show — elgoose pre-seeds the schedule,
    // so the nightly sync has tonight's row long before doors.
    const known = await d.select({ id: schema.shows.showId }).from(schema.shows)
      .where(eq(schema.shows.showDate, date)).limit(1);
    if (known.length === 0) return { live: false, date };

    const claimed = claimRows(await d.execute(sql`
      insert into live_sync_state (id, last_run_at, last_date)
      values (1, now(), ${date})
      on conflict (id) do update set last_run_at = now(), last_date = ${date}
      where live_sync_state.last_run_at is null
         or live_sync_state.last_run_at < now() - make_interval(secs => ${DEBOUNCE_SECONDS})
      returning id
    `));
    if (claimed.length === 0) return { live: true, date, claimed: false };

    const ua = process.env.ELGOOSE_USER_AGENT;
    const client = deps?.client ?? createElgooseClient(ua ? { userAgent: ua } : {});
    const summary = await runLiveSync({ client, db: d, date });
    await d.execute(sql`update live_sync_state set last_summary = ${JSON.stringify(summary)} where id = 1`);
    return { live: true, date, claimed: true, summary };
  } catch (e) {
    return { live: true, date, error: e instanceof Error ? e.message : String(e) };
  }
}

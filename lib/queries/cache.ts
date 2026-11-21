import { etToday } from "@/lib/today";
import { createLimiter } from "./limit";
import { formatTimeoutReport, isConnectTimeout, loopLag, startLoopLagMonitor } from "./loop-lag";

/**
 * How many catalog reads may be in flight on one server instance. Two under the
 * pool's 10 (db/client.ts), which leaves room for the live-show sync's own
 * writes — they don't come through here. See createLimiter for why going over
 * the pool is a hang and not just a wait.
 */
const READ_CONCURRENCY = 8;
const limitRead = createLimiter(READ_CONCURRENCY);

/**
 * Next.js Data Cache tag for every catalog read. The nightly sync (and the
 * optional /api/revalidate webhook) bust this so a write becomes visible
 * without waiting for the TTL. Live-show pulls use the narrower show tags
 * instead — busting the whole catalog every minute would keep Neon awake
 * for every other page during a show.
 */
export const CATALOG_TAG = "catalog";

/** One hour. The catalog moves once a night; a live show has its own tags. */
export const CATALOG_REVALIDATE_SECONDS = 3600;

export function showDateTag(date: string): string {
  return `show:${date}`;
}

export function showIdTag(showId: number): string {
  return `show-id:${showId}`;
}

/**
 * True inside the Next.js app server and on Vercel. Vitest, `tsx` scripts,
 * and drizzle-kit leave both unset, so they hit the database directly.
 *
 * `VERCEL=1` is the belt: Next inlines `NEXT_RUNTIME` in the server bundle,
 * but if that define is missing the cache would stay off in production and
 * every page would keep opening Postgres. Vercel always sets `VERCEL`.
 */
export function cacheEnabled(): boolean {
  return (
    process.env.NEXT_RUNTIME === "nodejs" ||
    process.env.NEXT_RUNTIME === "edge" ||
    process.env.VERCEL === "1"
  );
}

/**
 * Next's cache API, or null when we aren't running inside it.
 *
 * `unstable_cache` and `revalidateTag` exist only in the Next server. Vitest,
 * `tsx` scripts and drizzle-kit import this module too, so every use has to
 * tolerate their absence — here, once, rather than at each of the three call
 * sites that used to carry their own copy of this try/catch.
 */
async function nextCache(): Promise<typeof import("next/cache") | null> {
  if (!cacheEnabled()) return null;
  try {
    return await import("next/cache");
  } catch {
    return null;
  }
}

export type CachedQueryOpts = {
  tags?: string[];
  revalidate?: number;
  /** Include today's ET date in the cache key (queries that split played / upcoming). */
  varyByToday?: boolean;
};

/**
 * Cache a read against Neon for the Next.js Data Cache.
 *
 * Pages stay `force-dynamic` because the experience cookie is a Dynamic API,
 * so HTML cannot be ISR'd — but the queries can. Hits never open a Postgres
 * connection, which is what lets Neon scale to zero between visitors.
 */
export async function cachedQuery<T>(
  key: string,
  args: unknown[],
  fn: () => T | Promise<T>,
  opts: CachedQueryOpts = {},
): Promise<T> {
  const cache = await nextCache();
  if (!cache) return limitRead(fn);
  // Measure how late this instance's event loop runs, so a connect timeout can
  // say whether the CPU was too busy to finish the handshake (loop-lag.ts).
  startLoopLagMonitor();
  // What the query itself did, recorded so the catch below can tell a failure in
  // Next's cache plumbing (retryable) from a failure in the read (not). Without
  // this the catch swallows a failed query and runs it again — a second round
  // trip against a database that has just said it is struggling, and a second
  // error that replaces the real one.
  let succeeded: { value: T } | undefined;
  let failed: { error: unknown } | undefined;
  const run = async () => {
    try {
      const value = await limitRead(fn);
      succeeded = { value };
      return value;
    } catch (error) {
      failed = { error };
      if (isConnectTimeout(error)) reportConnectTimeout();
      throw error;
    }
  };
  try {
    const keyParts = [key, ...args.map((a) => JSON.stringify(a))];
    if (opts.varyByToday) keyParts.push(etToday());
    return await cache.unstable_cache(run, keyParts, {
      revalidate: opts.revalidate ?? CATALOG_REVALIDATE_SECONDS,
      tags: opts.tags ?? [CATALOG_TAG],
    })();
  } catch {
    // The read failed. That is the page's answer; don't ask twice.
    if (failed) throw failed.error;
    // The read worked and only the cache write didn't — we already hold the rows.
    if (succeeded) return succeeded.value;
    // `unstable_cache` needs Next's request cache, and throws before it ever
    // calls `run` when there isn't one. If we're somehow in a Node runtime
    // without it, miss rather than fail the page.
    return limitRead(fn);
  }
}

/**
 * Drop a set of tags. Reports whether Next actually took them.
 *
 * Two reasons this returns a boolean instead of void. A caller that has to
 * answer for the bust — /api/revalidate tells the nightly Action whether the
 * cache moved — cannot answer honestly from a void. And a silent failure here
 * is invisible by construction: a live setlist that is an hour stale looks
 * exactly like one that is current, so the warning is the only signal there is.
 */
/** Expire on the spot rather than stale-while-revalidate. */
export const BUST_NOW = { expire: 0 } as const;

async function bustTags(tags: string[], what: string): Promise<boolean> {
  const cache = await nextCache();
  if (!cache) return false;
  try {
    // `{ expire: 0 }`, not "max": since Next 16, "max" marks the tag stale and
    // serves the old entry while it refreshes — the hour-stale live setlist this
    // function exists to prevent. Expire-now is what a sync webhook needs.
    for (const tag of tags) cache.revalidateTag(tag, BUST_NOW);
    return true;
  } catch (e) {
    // `revalidateTag` throws outside a request, and during render. Say so.
    console.warn(`[cache] could not drop ${what}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/** Drop the cached rows for one date after a live-show pull. */
export function revalidateLiveShow(date: string, showIds: number[]): Promise<boolean> {
  return bustTags([showDateTag(date), ...showIds.map(showIdTag)], `show ${date}`);
}

/** Drop every catalog entry. Called from POST /api/revalidate after the nightly sync. */
export function revalidateCatalog(): Promise<boolean> {
  return bustTags([CATALOG_TAG], "the catalog");
}

/** Log a connect timeout beside this instance's event-loop lag and read load
 * (diagnostic, 2026-11-19: is Vercel's CPU the bottleneck? See loop-lag.ts). */
function reportConnectTimeout(): void {
  try {
    const { active, waiting } = limitRead.load();
    console.warn(
      formatTimeoutReport(loopLag(), {
        readsActive: active,
        readsWaiting: waiting,
        rssMb: Math.round(process.memoryUsage().rss / 1e6),
        uptimeS: Math.round(process.uptime()),
      }),
    );
  } catch {
    // A diagnostic must never be the thing that breaks a page.
  }
}

import { monitorEventLoopDelay, type ELDHistogram } from "node:perf_hooks";

/**
 * Is the server too busy to open a database connection? (2026-11-19)
 *
 * Production logs a CONNECT_TIMEOUT every few minutes, and most of them fire
 * during the TLS handshake — after TCP has connected and the pooler has agreed
 * to TLS (postgres.js reports those as `undefined:undefined`, because the TLS
 * socket it swaps in carries no host). The pooler finishes that handshake in
 * well under a second from anywhere; so either the network stalls, or this
 * instance's event loop is too busy to run it: Fluid compute serves many
 * requests on one standard (1 vCPU) instance, and every page renders per
 * request. This module tells those apart. Each instance measures how late its
 * event loop runs, and a connect timeout logs that measurement beside it.
 *
 * What it found (2026-11-27): neither. The timeouts came with single stalls of
 * 37–245s and ~20ms either side, and failed within a second of the request
 * arriving. No CPU stalls like that; a suspended instance does. The reading
 * that fits: Vercel freezes an idle instance, and a connection attempt left
 * open by an earlier request wakes up with its 30s timer long expired. lib/queries/connect-keepalive.ts
 * fixes that. Kept so the next deploy can show the timeouts are gone: a lag
 * of seconds to minutes means a suspension, not load.
 */

const WINDOW_MS = 60_000;
const NS_PER_MS = 1e6;

export type LagWindow = { maxMs: number; p99Ms: number; meanMs: number; seconds: number };

let histogram: ELDHistogram | null = null;
let windowStart = 0;
let previous: LagWindow | null = null;

function read(h: ELDHistogram, since: number): LagWindow {
  const ms = (ns: number) => (Number.isFinite(ns) ? Math.round(ns / NS_PER_MS) : 0);
  return { maxMs: ms(h.max), p99Ms: ms(h.percentile(99)), meanMs: ms(h.mean), seconds: Math.round((Date.now() - since) / 1000) };
}

/** Start measuring, once per instance. Never throws: a diagnostic must not
 * take a page down. */
export function startLoopLagMonitor(): void {
  if (histogram) return;
  try {
    histogram = monitorEventLoopDelay({ resolution: 20 });
    histogram.enable();
    windowStart = Date.now();
    // Keep the last full minute beside the current one, so a timeout just
    // after a reset still has the recent past to report.
    setInterval(() => {
      if (!histogram) return;
      previous = read(histogram, windowStart);
      histogram.reset();
      windowStart = Date.now();
    }, WINDOW_MS).unref();
  } catch {
    histogram = null;
  }
}

/** The current (partial) window and the last full one, or null when not measuring. */
export function loopLag(): { current: LagWindow; previous: LagWindow | null } | null {
  if (!histogram) return null;
  return { current: read(histogram, windowStart), previous };
}

/** Did this error, or anything it wraps, come from a connect timeout? Drizzle
 * wraps the driver's error as `cause` ("Failed query: …"). */
export function isConnectTimeout(error: unknown): boolean {
  let e: unknown = error;
  for (let depth = 0; e && depth < 4; depth++) {
    if (typeof e === "object" && (e as { code?: unknown }).code === "CONNECT_TIMEOUT") return true;
    e = typeof e === "object" ? (e as { cause?: unknown }).cause : undefined;
  }
  return false;
}

export type InstanceLoad = { readsActive: number; readsWaiting: number; rssMb: number; uptimeS: number };

/** One log line: everything needed to tell a starved instance from a slow network. */
export function formatTimeoutReport(lag: ReturnType<typeof loopLag>, load: InstanceLoad): string {
  const w = (x: LagWindow) => `max ${x.maxMs}ms p99 ${x.p99Ms}ms mean ${x.meanMs}ms over ${x.seconds}s`;
  const lagText = lag
    ? `event loop lag ${w(lag.current)}${lag.previous ? `; previous minute ${w(lag.previous)}` : ""}`
    : "event loop lag not measured";
  return (
    `[db] CONNECT_TIMEOUT · ${lagText} · reads ${load.readsActive} active, ${load.readsWaiting} waiting · ` +
    `rss ${load.rssMb}MB · instance up ${load.uptimeS}s`
  );
}

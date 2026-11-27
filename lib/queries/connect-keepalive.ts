import dc from "node:diagnostics_channel";

/**
 * Keep each database connection attempt inside the request that started it.
 *
 * What this fixes (diagnosed 2026-11-27 from production logs): a page runs its
 * reads at once, and postgres.js opens a connection for each one that has to
 * wait. The first to open serves them all — the rest keep opening with nobody
 * waiting on them. The response goes out, Vercel suspends the idle instance,
 * and those attempts sit frozen mid-handshake with their 30s connect timers
 * running on a clock that keeps going. The next request to wake the instance
 * queues behind them (the pool counts them as already on the way), the
 * expired timers fire before anything else can happen, and every queued read
 * fails with CONNECT_TIMEOUT within milliseconds of arriving. The logs show
 * exactly that: requests failing 270ms after they arrived, beside "event loop
 * lag" of 245s — the suspension itself, not a busy CPU (lib/queries/loop-lag.ts).
 *
 * postgres.js publishes every attempt on the `postgres:connect` tracing
 * channel (its README: "every attempt to connect to a host, up to a ready
 * connection or an error"). When one starts, this hands Next's `after()` a
 * promise that settles when the attempt does; `after()` passes it to Vercel's
 * `waitUntil`, so the instance stays up until the attempt finishes — normally
 * well under a second, at most the connect timeout. Nothing is left in flight
 * to be frozen.
 */

type After = (task: Promise<unknown>) => void;

/** A ceiling, past the 30s connect timeout (db/client.ts), so a missed end
 * event can't hold an instance open until the platform kills it. */
const MAX_HOLD_MS = 35_000;

export const CONNECT_CHANNEL = "postgres:connect";

/**
 * Hold each connection attempt open in the request that started it. Returns
 * the unsubscribe (tests use it; the app subscribes once, below).
 */
export function subscribeConnectKeepAlive(after: After): () => void {
  const pending = new WeakMap<object, () => void>();
  const handlers = {
    start(ctx: unknown) {
      if (typeof ctx !== "object" || ctx === null) return;
      let release!: () => void;
      const settled = new Promise<void>((resolve) => (release = resolve));
      const ceiling = setTimeout(() => release(), MAX_HOLD_MS);
      ceiling.unref?.();
      pending.set(ctx, () => {
        clearTimeout(ceiling);
        release();
      });
      try {
        // Runs in the async context of whatever asked for the connection, so
        // `after` binds the attempt to that request.
        after(settled);
      } catch {
        // No request to keep alive (a build, a script, or a request that has
        // already closed). The attempt carries on as it always did.
      }
    },
    // postgres.js publishes asyncEnd for a ready connection and for an error
    // (after `error`), so this is the one place an attempt ends.
    asyncEnd(ctx: unknown) {
      if (typeof ctx !== "object" || ctx === null) return;
      pending.get(ctx)?.();
      pending.delete(ctx);
    },
    end() {},
    asyncStart() {},
    error() {},
  };
  const channel = dc.tracingChannel(CONNECT_CHANNEL);
  channel.subscribe(handlers);
  return () => channel.unsubscribe(handlers);
}

let installed = false;

/** Subscribe once per process. `after` is Next's, from next/server. */
export function keepConnectsAlive(after: After): void {
  if (installed) return;
  installed = true;
  subscribeConnectKeepAlive(after);
}

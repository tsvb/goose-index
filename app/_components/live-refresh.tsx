"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Interval + visibility wiring for LiveRefresh: poll only while the tab is
 * visible — going hidden stops the timer, coming back refreshes immediately
 * (to catch up) and restarts it. Returns the cleanup; exported and typed
 * structurally so the node tests can drive it with a stubbed document.
 *
 * `catchUpMs` adds one early refresh after binding. The page that mounted this
 * was rendered *before* its own load kicked off a pull (the server syncs after
 * the response is sent), so without it a reader who arrives mid-show looks at
 * the previous pull's setlist for a full interval.
 */
export function bindLiveRefresh(
  doc: {
    hidden: boolean;
    addEventListener(type: string, fn: () => void): void;
    removeEventListener(type: string, fn: () => void): void;
  },
  refresh: () => void,
  intervalMs = 75_000,
  catchUpMs?: number,
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  let catchUp: ReturnType<typeof setTimeout> | null = null;
  const stop = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
    if (catchUp !== null) clearTimeout(catchUp);
    catchUp = null;
  };
  const onVisibility = () => {
    stop();
    if (!doc.hidden) {
      refresh();
      timer = setInterval(refresh, intervalMs);
    }
  };
  doc.addEventListener("visibilitychange", onVisibility);
  if (!doc.hidden) {
    timer = setInterval(refresh, intervalMs);
    if (catchUpMs !== undefined) catchUp = setTimeout(refresh, catchUpMs);
  }
  return () => {
    stop();
    doc.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * One tick of the live loop: ask the server to pull elgoose, wait for it, then
 * re-render the page.
 *
 * The order is the point. Re-rendering first (what this used to do) shows the
 * *previous* pull and only then starts a new one, whose rows nobody sees until
 * the tick after — every song arrived one interval late. Waiting on /api/live
 * means the render that follows already holds what was just fetched.
 *
 * It costs elgoose nothing extra: /api/live is the same debounced sync the page
 * render triggers, so there is still at most one pull per tick, and the render
 * that follows lands inside the debounce window and pulls nothing.
 *
 * A failed or slow sync must not freeze the page, so the refresh runs either
 * way; and a tick that fires while the last one is still in flight is dropped
 * rather than stacked.
 */
export function createLiveTick(
  sync: () => Promise<unknown>,
  refresh: () => void,
): () => Promise<void> {
  let inFlight = false;
  return async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      await sync();
    } catch {
      /* the page still re-renders from whatever the last pull stored */
    } finally {
      inFlight = false;
    }
    refresh();
  };
}

/** How long after mount to pick up the pull this page's own load started. */
const CATCH_UP_MS = 8_000;
/** Give up waiting on /api/live and re-render anyway. */
const SYNC_TIMEOUT_MS = 20_000;

/**
 * Rendered only while this page's show is inside its live window (the server
 * decides). Every 75s while the tab is visible it has the server pull elgoose
 * (debounced there, so many open tabs still mean one pull) and then re-renders
 * the page with the result — see createLiveTick.
 */
export function LiveRefresh({ minimal }: { minimal?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const tick = createLiveTick(
      () => fetch("/api/live", { cache: "no-store", signal: AbortSignal.timeout(SYNC_TIMEOUT_MS) }),
      () => router.refresh(),
    );
    return bindLiveRefresh(document, () => void tick(), 75_000, CATCH_UP_MS);
  }, [router]);

  if (minimal) {
    return <p className="doc-live" role="status">This show is in progress — the setlist updates automatically.</p>;
  }
  return (
    <span className="live-flag" role="status" aria-label="Show in progress — the setlist updates automatically">
      <span className="live-dot" aria-hidden />
      live
    </span>
  );
}

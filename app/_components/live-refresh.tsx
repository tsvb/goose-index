"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Interval + visibility wiring for LiveRefresh: poll only while the tab is
 * visible — going hidden stops the timer, coming back refreshes immediately
 * (to catch up) and restarts it. Returns the cleanup; exported and typed
 * structurally so the node tests can drive it with a stubbed document.
 */
export function bindLiveRefresh(
  doc: {
    hidden: boolean;
    addEventListener(type: string, fn: () => void): void;
    removeEventListener(type: string, fn: () => void): void;
  },
  refresh: () => void,
  intervalMs = 75_000,
): () => void {
  let timer: ReturnType<typeof setInterval> | null = null;
  const stop = () => {
    if (timer !== null) clearInterval(timer);
    timer = null;
  };
  const onVisibility = () => {
    stop();
    if (!doc.hidden) {
      refresh();
      timer = setInterval(refresh, intervalMs);
    }
  };
  doc.addEventListener("visibilitychange", onVisibility);
  if (!doc.hidden) timer = setInterval(refresh, intervalMs);
  return () => {
    stop();
    doc.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * Rendered only while this page's show is inside its live window (the server
 * decides). Re-pulls the server-rendered page every 75s while the tab is
 * visible; each refresh also re-fires the server's debounced elgoose
 * live-sync, so the setlist keeps itself current for as long as anyone has
 * the page open.
 */
export function LiveRefresh({ minimal }: { minimal?: boolean }) {
  const router = useRouter();
  useEffect(() => bindLiveRefresh(document, () => router.refresh()), [router]);

  if (minimal) {
    return <p className="doc-live" role="status">This show is in progress — the setlist updates automatically.</p>;
  }
  return (
    <span className="live-pill" role="status" aria-label="Show in progress — the setlist updates automatically">
      <span className="live-dot" aria-hidden />
      LIVE
    </span>
  );
}

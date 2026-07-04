"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Rendered only while this page's show is inside its live window (the server
 * decides). Re-pulls the server-rendered page every 75s; each refresh also
 * re-fires the server's debounced elgoose live-sync, so the setlist keeps
 * itself current for as long as anyone has the page open.
 */
export function LiveRefresh({ minimal }: { minimal?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 75_000);
    return () => clearInterval(t);
  }, [router]);

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

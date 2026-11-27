import { NextResponse } from "next/server";
import { maybeLiveSync } from "@/lib/sync/maybe-live";

// Status + trigger endpoint for the live-show sync: GET during a show window
// refreshes tonight's setlist (debounced server-side) and reports what
// happened. Outside a window it cheaply reports { live: false }. An open show
// page calls it before each re-render (LiveRefresh), so the render shows the
// pull that just finished rather than the one before it. Safe to
// expose unauthenticated — it can only pull public elgoose data for tonight,
// at most once per debounce window.
export const dynamic = "force-dynamic";

/**
 * Vercel's CDN answers repeat calls for this long, so every open tab polling at
 * once costs one function run per window, not one per tab. The price is lag:
 * the sync's own 60s debounce (lib/sync/maybe-live.ts) can open while the CDN
 * still holds the last answer, so a pull can start up to this many seconds
 * later than it would have. Browsers get `no-store`; only the CDN keeps it.
 */
const LIVE_CDN_SECONDS = 30;

const LIVE_HEADERS = {
  "cache-control": "no-store",
  "vercel-cdn-cache-control": `max-age=${LIVE_CDN_SECONDS}`,
} as const;

export async function GET() {
  const status = await maybeLiveSync();
  // The raw message stays in the function log. A driver error names the
  // database host and role, and this endpoint answers anyone.
  if (status.error) {
    console.warn(`[live] ${status.date ?? "?"} sync failed: ${status.error}`);
    status.error = "live sync failed";
    // Don't hold a failure at the CDN: the next tab's call should try again.
    return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
  }
  return NextResponse.json(status, { headers: LIVE_HEADERS });
}

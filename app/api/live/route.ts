import { NextResponse } from "next/server";
import { maybeLiveSync } from "@/lib/sync/maybe-live";

// Status + trigger endpoint for the live-show sync: GET during a show window
// refreshes tonight's setlist (debounced server-side) and reports what
// happened. Outside a window it cheaply reports { live: false }. Safe to
// expose unauthenticated — it can only pull public elgoose data for tonight,
// at most once per debounce window.
export const dynamic = "force-dynamic";

export async function GET() {
  const status = await maybeLiveSync();
  // The raw message stays in the function log. A driver error names the
  // database host and role, and this endpoint answers anyone.
  if (status.error) {
    console.warn(`[live] ${status.date ?? "?"} sync failed: ${status.error}`);
    status.error = "live sync failed";
  }
  return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
}

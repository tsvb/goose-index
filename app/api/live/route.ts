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
  return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
}

import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { revalidateCatalog } from "@/lib/queries/cache";

/**
 * Called by the nightly sync Action after it writes, so the site's query
 * cache drops without waiting for the one-hour TTL. Disabled (501) until
 * REVALIDATE_SECRET is set on Vercel; GitHub Actions sends the same value
 * as `Authorization: Bearer …`.
 */
export const dynamic = "force-dynamic";

/**
 * Constant-time bearer check. `===` returns on the first differing byte, which
 * hands the secret to anyone who can time the response — and the prize here is
 * the ability to drop the catalog cache at will, i.e. to point every page render
 * at Neon, which is the one cost this cache exists to avoid.
 *
 * Comparing SHA-256 digests rather than the strings keeps both operands 32 bytes,
 * so `timingSafeEqual` never throws on a length mismatch and the length of the
 * supplied header leaks nothing either.
 */
function bearerMatches(header: string | null, secret: string): boolean {
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(header ?? ""), digest(`Bearer ${secret}`));
}

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "disabled" }, { status: 501 });
  }
  if (!bearerMatches(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Report what actually happened. Answering `{ revalidated: true }` no matter
  // what gives the nightly Action a green run for a cache that never moved —
  // and a cache that never moved is invisible from the outside.
  const revalidated = await revalidateCatalog();
  return NextResponse.json(
    revalidated ? { revalidated } : { revalidated, error: "revalidation unavailable" },
    { status: revalidated ? 200 : 500 },
  );
}

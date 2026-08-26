import { NextResponse } from "next/server";
import { revalidateCatalog } from "@/lib/queries/cache";

/**
 * Called by the nightly sync Action after it writes, so the site's query
 * cache drops without waiting for the one-hour TTL. Disabled (501) until
 * REVALIDATE_SECRET is set on Vercel; GitHub Actions sends the same value
 * as `Authorization: Bearer …`.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "disabled" }, { status: 501 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await revalidateCatalog();
  return NextResponse.json({ revalidated: true });
}

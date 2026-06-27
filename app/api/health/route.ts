import { db } from "@/db/client";
import { sql } from "drizzle-orm";

// Temporary diagnostic endpoint for verifying the deployed runtime can reach the
// database. Reports whether DATABASE_URL is present (and its host, no creds) and
// the exact error if a trivial query fails. Safe to remove once the deploy is green.
export const dynamic = "force-dynamic";

export async function GET() {
  const raw = process.env.DATABASE_URL;
  let host: string | null = null;
  if (raw) {
    try {
      host = new URL(raw.replace(/^postgres(ql)?:/, "http:")).host;
    } catch {
      host = "(unparseable)";
    }
  }

  const result: {
    hasDatabaseUrl: boolean;
    host: string | null;
    ok: boolean;
    error: string | null;
  } = { hasDatabaseUrl: Boolean(raw), host, ok: false, error: null };

  try {
    await db.execute(sql`select 1 as ok`);
    result.ok = true;
  } catch (e) {
    result.error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  return Response.json(result, { status: result.ok ? 200 : 500 });
}

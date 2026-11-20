// One resolver for the connection string, so every entry point agrees on it.
//
// `DATABASE_URL` is the canonical name: local `.env`, the GitHub Actions
// secret, and a hand-set Vercel var all use it, and it always wins.
// `POSTGRES_URL` is the fallback: it's what the Vercel ↔ Supabase integration
// injects into the Vercel environment (the transaction-mode pooler string),
// so a deployment wired up through the integration works without anyone
// copying a connection string by hand.
export function databaseUrl(): string | undefined {
  // `||`, not `??`: a Vercel variable can hold an empty string, and an empty
  // DATABASE_URL must not shadow a POSTGRES_URL that is actually set. The
  // trailing `|| undefined` keeps "" from escaping as a connection string.
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || undefined;
}

/**
 * The `ssl` option for a postgres.js connection to `url`.
 *
 * postgres.js only turns TLS on when the connection string says so
 * (`?sslmode=require`); a string without it connects in plaintext, and a
 * Supabase pooler accepts that unless "Enforce SSL" is switched on in the
 * dashboard. So a hand-copied DATABASE_URL missing the parameter would send
 * every query from Vercel and from the nightly Action unencrypted, and nothing
 * would say so.
 *
 * Any host that isn't this machine therefore gets TLS. An explicit `sslmode` /
 * `ssl` in the string still wins (returns undefined, so the driver reads it),
 * and localhost stays plain because a local Postgres has no certificate.
 * `"require"` encrypts without verifying the chain: Supabase signs its pooler
 * with its own CA, which Node does not ship.
 */
export function sslFor(url: string): "require" | undefined {
  try {
    const u = new URL(url);
    if (u.searchParams.has("sslmode") || u.searchParams.has("ssl")) return undefined;
    const host = u.hostname.replace(/^\[|\]$/g, "");
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "") return undefined;
    return "require";
  } catch {
    return undefined; // a malformed URL fails loudly at connect time
  }
}

/**
 * Why a connection string is wrong for a serverless function, or null.
 *
 * Supavisor serves two modes on one host: transaction mode on 6543, which is
 * what serverless needs, and session mode on 5432, where every client holds a
 * server connection for as long as it's connected and the whole project shares
 * a pool of 15 (with the nightly sync, which is meant to use it). A function
 * pointed at 5432 works until a handful of warm instances hold the pool — then
 * pages and builds fail with EMAXCONNSESSION. Three preview builds died that way
 * on 2026-11-19: the hand-set Preview POSTGRES_URL was the session string.
 *
 * Only a Supabase pooler host is judged; anything else (local Postgres, another
 * provider) returns null.
 */
export function sessionPoolerProblem(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith(".pooler.supabase.com")) return null;
    if (u.port !== "" && u.port !== "5432") return null;
    return (
      `the database URL points at Supabase's session-mode pooler (${u.hostname}:${u.port || "5432"}). ` +
      "Serverless functions need the transaction-mode pooler on port 6543; session mode shares one pool " +
      "of 15 connections across the project and fails with EMAXCONNSESSION once it fills. See docs/DEPLOY.md."
    );
  } catch {
    return null;
  }
}

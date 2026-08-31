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

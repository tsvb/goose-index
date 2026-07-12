/** Whether a migration run should bail out instead of touching the schema.
 *
 * Vercel scopes `DATABASE_URL` to Preview *and* Production, and both resolve to
 * the same Neon database — so a preview build that migrated would let any
 * pushed branch alter the production schema before review. Only the production
 * build may migrate, and on Vercel we fail closed: an env we don't recognise
 * gets skipped rather than trusted.
 *
 * Off Vercel (`VERCEL` unset — local shells, the nightly sync Action) this is
 * inert, so migrating by hand keeps working.
 */
export function shouldSkipMigrations(env: Record<string, string | undefined>): boolean {
  if (!env.VERCEL) return false;
  return env.VERCEL_ENV !== "production";
}

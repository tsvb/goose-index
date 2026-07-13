/**
 * Say out loud which database a script is about to write to.
 *
 * The `DATABASE_URL` in `.env` points at Neon — production. A handoff doc
 * asserted the opposite ("local is a different database; local runs do not touch
 * prod"), which is the kind of belief that loses a database: someone trusts it,
 * runs a destructive script "locally", and finds out afterwards.
 *
 * So no script relies on a doc, or on the reader's memory, to know where its
 * writes land. It prints the host first.
 */
export function announceTarget(url: string): { host: string; isProd: boolean } {
  let host = "unknown";
  try {
    host = new URL(url).hostname;
  } catch {
    /* a malformed URL will fail loudly at connect time; don't add noise here */
  }
  const isProd = /neon\.tech$/i.test(host);

  if (isProd) {
    console.log(`\n  ⚠  writing to PRODUCTION  (${host})\n`);
  } else {
    console.log(`  → writing to ${host}`);
  }
  return { host, isProd };
}

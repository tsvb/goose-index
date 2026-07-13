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
export function announceTarget(
  url: string,
  opts: { readOnly?: boolean } = {},
): { host: string; isProd: boolean } {
  let host = "unknown";
  try {
    host = new URL(url).hostname;
  } catch {
    /* a malformed URL will fail loudly at connect time; don't add noise here */
  }
  const isProd = /neon\.tech$/i.test(host);

  // A warning that cries wolf gets ignored, so a read-only script says so rather
  // than shouting about writes it will never make.
  const verb = opts.readOnly ? "reading from" : "writing to";
  if (isProd) {
    console.log(opts.readOnly ? `\n  ·  ${verb} PRODUCTION  (${host})\n` : `\n  ⚠  ${verb.toUpperCase()} PRODUCTION  (${host})\n`);
  } else {
    console.log(`  → ${verb} ${host}`);
  }
  return { host, isProd };
}

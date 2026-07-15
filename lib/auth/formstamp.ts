import { createHmac } from "node:crypto";

const secret = () => process.env.AUTH_SECRET ?? "goose-index-dev-stamp";
const sign = (ts: string) => createHmac("sha256", secret()).update(ts).digest("hex");

/** Anti-bot time-trap: a signed issue-time the form must carry back. */
export function issueFormStamp(now = Date.now()): string {
  const ts = String(now);
  return `${ts}.${sign(ts)}`;
}

export function checkFormStamp(stamp: string | null | undefined, minAgeMs = 3000, now = Date.now()): boolean {
  if (!stamp) return false;
  const [ts, sig] = stamp.split(".");
  if (!ts || !sig || sig !== sign(ts)) return false;
  const age = now - Number(ts);
  return age >= minAgeMs && age <= 24 * 3_600_000;
}

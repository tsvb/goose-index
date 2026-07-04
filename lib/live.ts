const ET = "America/New_York";

function etParts(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ET, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  // Some ICU builds render midnight as "24" with hour12:false.
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

function prevDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

/**
 * The show date that could be on stage right now, or null outside the window.
 * elgoose show dates are the venue-local calendar date; Goose tours the US, so
 * Eastern Time anchors a generous window — from 3pm ET on the show date until
 * 4am ET the next morning (a 10pm Pacific encore is only 1am ET). Inside the
 * window the sync is a cheap idempotent no-op unless data actually changed,
 * so the width costs nothing.
 */
export function liveCandidateDate(now: Date): string | null {
  const { date, hour } = etParts(now);
  if (hour >= 15) return date;
  if (hour < 4) return prevDate(date);
  return null;
}

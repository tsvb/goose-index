/**
 * The site's clock.
 *
 * Everything that asks "what day is it?" — tonight's show, played vs upcoming,
 * on this day, every `show_date <= today` aggregate — answers from here.
 *
 * **Never ask Postgres.** `current_date` follows the database server's
 * timezone, which is not the band's: Neon (production) runs UTC, and a local
 * Homebrew Postgres runs whatever the laptop is set to. So "today" meant
 * different days in dev and prod, and in production it rolled over at 8pm ET —
 * which is how the shows page came to call tomorrow's show "tonight's show"
 * every evening from 8pm, and how tomorrow's show fell out of "upcoming" at
 * the same moment.
 *
 * Eastern Time is the anchor. Show dates in the dataset are venue-local
 * calendar dates and Goose tours all four zones, so no single zone is right for
 * every show; ET is the one `lib/live.ts` already anchors the live window to,
 * and picking the same one keeps the whole site on one clock.
 */
export const SITE_TZ = "America/New_York";

/** The ET calendar date and hour at `now`. */
export function etParts(now: Date): { date: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SITE_TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hour12: false,
  }).formatToParts(now);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  // Some ICU builds render midnight as "24" with hour12:false.
  const hour = Number(get("hour")) % 24;
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour };
}

/** Today's calendar date in ET, as `YYYY-MM-DD`. */
export function etToday(now: Date = new Date()): string {
  return etParts(now).date;
}

/** The current year in ET. Year axes and "this year" cuts read from here so
 *  they agree with the ET dates the queries filter on. */
export function etYear(now: Date = new Date()): number {
  return Number(etToday(now).slice(0, 4));
}

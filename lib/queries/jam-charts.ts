import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { today } from "./today";

/**
 * A jam is `is_jamchart`. That is the whole definition, and it is the same one
 * in every query and every component — the star you see and the number you
 * count come from one column.
 *
 * They didn't always. The three aggregates read `is_jam or is_jamchart` while
 * every marker read `is_jamchart` alone, two rules that agreed only because
 * elgoose leaves `is_jam` empty for every artist. Collapsing to one term makes
 * the agreement structural instead of coincidental; `lib/queries/jam-definition.test.ts`
 * pins it, and `checkDeadJamFlag` watches the assumption it rests on.
 */

/**
 * When a show has no jam-chart entries, that can mean two opposite things.
 *
 * elgoose's jam charts are curated by hand, days or weeks behind the setlist.
 * So a night with no entries is either a night nobody stretched out, or a night
 * nobody has got to yet — and the row looks identical either way. Rendered
 * without that distinction, a show played last week reads as a show with no
 * jams, which is a claim the data cannot support.
 *
 * The split is readable from the corpus itself: find the newest show carrying
 * any entry at all. Nothing has been filed past that date, so a show after it
 * with nothing of its own is waiting, not quiet. A show before it with nothing
 * of its own has been passed over — that absence is settled.
 *
 * The frontier is derived per request rather than fixed, because it moves every
 * time the curators file a chart, and a hard-coded lag would be wrong within a
 * week. There is no lag constant here on purpose: this repo has no way to
 * measure how long elgoose actually takes, so it doesn't guess.
 *
 * Known limit: the frontier is a date, while charts are filed per show. On a
 * two-show day whose matinee is charted and whose evening is not, the evening
 * reads as settled and stays silent. Five dates in the corpus have ever had
 * mixed siblings, and it only bites when such a date is the frontier itself —
 * so it is left alone deliberately. Silence is the right way to be wrong here:
 * the alternative tells a night with genuinely no jams that its charts are
 * late.
 */

function allRows(result: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return rows as Record<string, unknown>[];
}

/** The newest show date carrying any jam-chart entry, or null if none does. */
export async function jamChartFrontier(): Promise<string | null> {
  const rows = allRows(await db.execute(sql`
    select max(s.show_date)::text as frontier
    from shows s
    join performances p on p.show_id = s.show_id
    where p.is_jamchart = true
      and s.show_date <= ${today()}
  `));
  const frontier = rows[0]?.frontier;
  return typeof frontier === "string" ? frontier : null;
}

/** Whether this show's silence is "not filed yet" rather than "nothing to file". */
export function awaitingJamCharts(
  { date, frontier, hasEntries, hasSetlist = true }:
  { date: string; frontier: string | null; hasEntries: boolean; hasSetlist?: boolean },
): boolean {
  if (hasEntries) return false;
  // Every announced date is a show row long before it is a show. Each sits past
  // the frontier by definition, so without this the whole upcoming calendar
  // would report its jam charts as running late.
  if (!hasSetlist) return false;
  // No frontier means no chart has ever been filed. With nothing to read the
  // show against, saying "not yet" would be the invention this exists to avoid.
  if (frontier == null) return false;
  return date > frontier;
}

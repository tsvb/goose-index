import { sql } from "drizzle-orm";
import type { AppDb } from "@/db/schema";
import type { CheckResult } from "./checks";

/**
 * Does our cache still say what elgoose says?
 *
 * `verify` checks the database against *itself* — floors, orphans, duplicate
 * positions — which catches a broken sync but not a drifting one. Nothing checked
 * the copy against the original, so "are the tours right?" had no repeatable
 * answer: it took an ad-hoc script and a pair of eyes.
 *
 * elgoose is the source of truth. Every show carries its own tour_id and
 * tourname, so a tour is not an entity we can get wrong on its own — it is
 * whatever set of shows point at it. This compares the assignment show by show.
 */

/** The shape we need from elgoose's shows.json. */
export type SourceShow = {
  show_id: number | string;
  showdate: string;
  artist_id: number | string;
  tour_id: number | string;
  tourname: string;
};

/** Goose. elgoose tracks ~100 other artists — side projects, guests, other bands —
 * and the sync deliberately keeps only this one. Their shows are not ours to hold. */
export const GOOSE_ARTIST_ID = 1;

export async function auditAgainstSource(deps: {
  db: AppDb;
  fetchShows: () => Promise<SourceShow[]>;
}): Promise<CheckResult[]> {
  const source = (await deps.fetchShows()).filter((s) => Number(s.artist_id) === GOOSE_ARTIST_ID);

  const rows = (await deps.db.execute(sql`
    select s.show_id, s.show_date::text as d, s.tour_id, t.name as tour_name
    from shows s left join tours t on t.tour_id = s.tour_id
  `)) as unknown as { show_id: number; d: string; tour_id: number | null; tour_name: string | null }[];
  const ours = new Map(rows.map((r) => [Number(r.show_id), r]));

  let missing = 0;
  let tourDrift = 0;
  let dateDrift = 0;
  let nameDrift = 0;
  const examples: string[] = [];

  for (const s of source) {
    const id = Number(s.show_id);
    const mine = ours.get(id);
    if (!mine) {
      missing++;
      if (examples.length < 5) examples.push(`show ${id} (${s.showdate}) absent`);
      continue;
    }
    if (String(mine.d) !== String(s.showdate)) dateDrift++;
    if (Number(mine.tour_id ?? 0) !== (Number(s.tour_id) || 0)) {
      tourDrift++;
      if (examples.length < 5) {
        examples.push(`show ${id}: elgoose tour ${s.tour_id} "${s.tourname}", ours ${mine.tour_id}`);
      }
    } else if (s.tourname && mine.tour_name && mine.tour_name !== s.tourname) {
      nameDrift++;
    }
  }
  // A show we hold that elgoose no longer has is drift too: shows do get merged
  // or withdrawn, and a stale row would keep appearing on the site forever.
  const stale = [...ours.keys()].filter((id) => !source.some((s) => Number(s.show_id) === id)).length;

  const detail = (n: number, what: string) =>
    n === 0 ? `all ${source.length} shows agree` : `${n} ${what}${examples.length ? ` — e.g. ${examples[0]}` : ""}`;

  return [
    { name: "source: shows present", pass: missing === 0, detail: detail(missing, "shows missing from our cache") },
    { name: "source: no stale shows", pass: stale === 0, detail: stale === 0 ? "no shows we hold have left elgoose" : `${stale} shows we hold are gone from elgoose` },
    { name: "source: show dates", pass: dateDrift === 0, detail: detail(dateDrift, "dates disagree") },
    { name: "source: tour assignment", pass: tourDrift === 0, detail: detail(tourDrift, "shows are on the wrong tour") },
    { name: "source: tour names", pass: nameDrift === 0, detail: nameDrift === 0 ? "tour names match" : `${nameDrift} tour names disagree` },
  ];
}

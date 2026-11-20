import type { TourRun } from "@/lib/queries/dimensions";
import { splitLegs } from "@/app/_components/tour-timeline";

/**
 * 3.0's tours page, as Yeti would shelve it (spec 2026-11-18, round 3): runs
 * filed by *when* — on the road, coming up, just back, the crate — rather than
 * drawn on a calendar. Pure, so the shelving and the ring are tested without a
 * database. Dates are ISO strings in the site's ET calendar (`etToday()`).
 */

export type Shelved = {
  /** The run whose first and last shows bracket today. */
  running: TourRun | null;
  /** Runs that haven't started, soonest first. */
  upcoming: TourRun[];
  /** With nothing running, the latest finished run, shown on its own shelf. */
  justBack: TourRun | null;
  /** Every other finished run, newest first. */
  crate: TourRun[];
};

export function shelveTours(runs: TourRun[], today: string): Shelved {
  const byStartDesc = [...runs].sort((a, b) => b.start.localeCompare(a.start));
  const running = byStartDesc.find((r) => r.start <= today && today <= r.end) ?? null;
  const upcoming = byStartDesc.filter((r) => r.start > today).reverse();
  const past = byStartDesc.filter((r) => r.end < today);
  const justBack = running ? null : (past[0] ?? null);
  return { running, upcoming, justBack, crate: running ? past : past.slice(1) };
}

/** Where a running tour stands today. The site knows dates, not stage time, so
 * a show today is "tonight", never "live". */
export type RunPlace =
  | { kind: "tonight"; show: number; played: number }
  | { kind: "off"; played: number }
  | { kind: "home"; until: string; played: number };

export function runPlace(dates: string[], today: string): RunPlace {
  const played = dates.filter((d) => d < today).length;
  const tonight = dates.indexOf(today);
  if (tonight >= 0) return { kind: "tonight", show: tonight + 1, played };
  const legs = splitLegs(dates);
  for (let i = 0; i < legs.length - 1; i++) {
    if (legs[i].end < today && today < legs[i + 1].start) return { kind: "home", until: legs[i + 1].start, played };
  }
  return { kind: "off", played };
}

/** One lit stretch of the year ring, as fractions of the year (0 = Jan 1, at the
 * top, running clockwise). `past` is a finished run's leg; on a running tour,
 * `played` is the foil up to today and `ahead` what's left; a run that hasn't
 * started is all `ahead`. */
export type Arc = { from: number; to: number; kind: "past" | "played" | "ahead" };

const isoDay = (iso: string) => new Date(iso + "T00:00:00Z");
const nextDay = (iso: string) => {
  const d = isoDay(iso);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
/** Fraction of its own year at the START of day `iso`. */
export function yearFraction(iso: string): number {
  const d = isoDay(iso);
  const y = d.getUTCFullYear();
  const jan1 = Date.UTC(y, 0, 1);
  return (d.getTime() - jan1) / (Date.UTC(y + 1, 0, 1) - jan1);
}

/** A stretch [from, to) of days as ring fractions, split where it crosses a new
 * year (a ring is one year, so a run over New Year's wraps to the top). */
function stretch(fromIso: string, toExclusiveIso: string, kind: Arc["kind"]): Arc[] {
  const from = yearFraction(fromIso);
  const sameYear = fromIso.slice(0, 4) === toExclusiveIso.slice(0, 4);
  if (sameYear) return [{ from, to: yearFraction(toExclusiveIso), kind }];
  // toExclusive is Jan 1 of the next year exactly → the stretch ends at 1.
  if (toExclusiveIso.slice(5) === "01-01") return [{ from, to: 1, kind }];
  return [{ from, to: 1, kind }, { from: 0, to: yearFraction(toExclusiveIso), kind }];
}

export function ringArcs(dates: string[], today: string, running: boolean): Arc[] {
  const arcs: Arc[] = [];
  for (const leg of splitLegs(dates)) {
    const end = nextDay(leg.end);
    if (leg.start > today) arcs.push(...stretch(leg.start, end, "ahead"));
    else if (leg.end < today || !running) arcs.push(...stretch(leg.start, end, running ? "played" : "past"));
    else {
      // Today falls inside this leg: foil through today, the rest ahead.
      const cut = nextDay(today);
      arcs.push(...stretch(leg.start, cut, "played"));
      if (cut < end) arcs.push(...stretch(cut, end, "ahead"));
    }
  }
  return arcs;
}

/** The run's route: where it opened and closed, and how many places it played. */
export function runRoute(places: (string | null)[]): { first: string | null; last: string | null; cities: number } {
  const known = places.filter((p): p is string => !!p);
  const city = (p: string | undefined) => (p ? p.split(",")[0].trim() : null);
  return { first: city(known[0]), last: city(known[known.length - 1]), cities: new Set(known).size };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "nov 3 – 21", "jun 13 – sep 2", "dec 20". Lowercase: the chrome voice. */
export function spanLabel(start: string, end: string): string {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  if (start === end) return `${MONTHS[sm - 1]} ${sd}`;
  if (sm === em && start.slice(0, 4) === end.slice(0, 4)) return `${MONTHS[sm - 1]} ${sd} – ${ed}`;
  return `${MONTHS[sm - 1]} ${sd} – ${MONTHS[em - 1]} ${ed}`;
}

/** Weeks out, first show to last, rounded; at least one. */
export function weeksOut(start: string, end: string): number {
  const days = (isoDay(end).getTime() - isoDay(start).getTime()) / 864e5 + 1;
  return Math.max(1, Math.round(days / 7));
}

/** "nov 19" — the queue rows' date. */
export function dayLabel(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
}

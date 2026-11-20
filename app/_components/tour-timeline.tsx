import { Fragment, type CSSProperties } from "react";
import Link from "next/link";
import type { TourSpan } from "@/lib/queries/dimensions";
import type { Experience } from "@/lib/experience";

/**
 * The touring year, drawn as time.
 *
 * A tour *is* an interval — "Jun 13 – Sep 2" and "May 22 – Jun 5" are wildly
 * different objects (eleven weeks against two) and in a list they are two
 * identical rows of text. An interval's native form is a bar on a calendar.
 *
 * Laid out one year per row against a Jan–Dec axis, three things appear that no
 * list can show: how long a run actually was, the *shape* of the year (the
 * summer grind, the winter quiet), and the gaps — the months with no tour at
 * all, which are invisible when you only draw the tours.
 *
 * Each show is a tick inside its bar, so the bar has rhythm and not just length:
 * three-night stands and travel days are visible in the spacing.
 */

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
/** Lane height and gap, in the row's own pixels. */
const LANE = { h: 24, gap: 4 } as const;

/** 3.0 (Yeti, round 2): the leg washes, in percent of the mark color over
 * night. No text sits on them in 3.0 (names print beside the bars). 2.0 keeps
 * its own recipe below, untouched. */
const YETI_LEG = { steelWash: 20, handWash: 14 } as const;
/** 3.0's name colors. The names sit beside the bars on night, not on a wash,
 * so the standing contrast gate's night checks cover them; the label test
 * re-derives them anyway. */
export const YETI_NAME_COLOR = { plain: "var(--muted)", hot: "var(--ember)", future: "var(--faint)" } as const;

/** 3.0 prints a tour's name beside its bars, not inside them: a name inside a
 * bar clips to a stub ("Su…") on all but the longest runs. The name takes the
 * side of the tour with more open lane before the neighboring tour (or the
 * year's edge), and it prints only when that gap is wide enough at the width
 * the lane actually renders. The lane is a CSS size container: a name needing
 * N px in a gap that is a fraction g of the lane hides below a lane width of
 * N / g. Thresholds are a static table in 20px steps, so Tailwind can see every
 * class it has to generate; a gap that would need more than the widest lane
 * gets no printed name at all. The name is always inside the link for screen
 * readers, on hover, and in the list below. */
const YETI_NAME_HIDE = [
  "@max-[220px]:hidden",
  "@max-[240px]:hidden",
  "@max-[260px]:hidden",
  "@max-[280px]:hidden",
  "@max-[300px]:hidden",
  "@max-[320px]:hidden",
  "@max-[340px]:hidden",
  "@max-[360px]:hidden",
  "@max-[380px]:hidden",
  "@max-[400px]:hidden",
  "@max-[420px]:hidden",
  "@max-[440px]:hidden",
  "@max-[460px]:hidden",
  "@max-[480px]:hidden",
  "@max-[500px]:hidden",
  "@max-[520px]:hidden",
  "@max-[540px]:hidden",
  "@max-[560px]:hidden",
  "@max-[580px]:hidden",
  "@max-[600px]:hidden",
  "@max-[620px]:hidden",
  "@max-[640px]:hidden",
  "@max-[660px]:hidden",
  "@max-[680px]:hidden",
  "@max-[700px]:hidden",
  "@max-[720px]:hidden",
  "@max-[740px]:hidden",
  "@max-[760px]:hidden",
  "@max-[780px]:hidden",
  "@max-[800px]:hidden",
  "@max-[820px]:hidden",
  "@max-[840px]:hidden",
  "@max-[860px]:hidden",
  "@max-[880px]:hidden",
  "@max-[900px]:hidden",
  "@max-[920px]:hidden",
  "@max-[940px]:hidden",
  "@max-[960px]:hidden",
] as const;
/** About 7.8px a character at 12px heavy (a safe margin over the measured
 * ~7px), plus 6px clear of the bar on one side and 8px of the neighbor on the
 * other. */
const nameWidthPx = (name: string) => name.length * 7.8 + 14;

export type NamePlacement = { side: "right" | "left"; hide: string };

/** Where 3.0 prints a tour's name, given its span and its lane neighbors, all in
 * percent of the year. Null when no lane is ever wide enough. */
export function yetiNamePlacement(
  name: string,
  span: { start: number; end: number },
  room: { prevEnd: number; nextStart: number },
): NamePlacement | null {
  const right = room.nextStart - span.end;
  const left = span.start - room.prevEnd;
  const side = right >= left ? "right" : "left";
  const gap = Math.max(right, left) / 100;
  if (gap <= 0) return null;
  const laneNeeded = nameWidthPx(name) / gap;
  if (laneNeeded <= YETI_NAME_HIDE_FLOOR) return { side, hide: "" };
  const step = Math.ceil((laneNeeded - YETI_NAME_HIDE_FLOOR) / 20) - 1;
  if (step >= YETI_NAME_HIDE.length) return null;
  return { side, hide: YETI_NAME_HIDE[Math.max(0, step)] };
}
/** Below this lane width (about the sm breakpoint) names don't print anyway. */
const YETI_NAME_HIDE_FLOOR = 200;

/** Places every name in one lane. Each open gap (before the first tour, between
 * two tours, after the last) holds at most one name, so two neighbors can't
 * print into the same gap and collide. Left to right, each tour takes the
 * larger of its two gaps that is still free. */
export function yetiLaneNames(
  names: string[],
  spans: { start: number; end: number }[],
): (NamePlacement | null)[] {
  const taken = new Set<number>();
  return names.map((name, k) => {
    const prevEnd = k > 0 ? spans[k - 1].end : 0;
    const nextStart = k < spans.length - 1 ? spans[k + 1].start : 100;
    const leftFree = !taken.has(k);
    const rightFree = !taken.has(k + 1);
    const place = yetiNamePlacement(name, spans[k], {
      prevEnd: leftFree ? prevEnd : spans[k].start,
      nextStart: rightFree ? nextStart : spans[k].end,
    });
    if (place) taken.add(place.side === "left" ? k : k + 1);
    return place;
  });
}

const dayOfYear = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - jan1) / 864e5);
};
const yearDays = (year: number) => (new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29 ? 366 : 365);

/** The row already says the year and the axis already says "tour", so a bar
 * labeled "Summer Tour 2026" spends its width repeating its own coordinates.
 * Strip both and "Summer" fits — which is the difference between a label you can
 * read and one that clips to "Summ…". Falls back to the full name if stripping
 * would leave nothing (e.g. "Goosemas III"). */
export function shortName(name: string): string {
  const stripped = name
    .replace(/\b(19|20)\d{2}\b/g, "")
    .replace(/\btour\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s—-]+|[\s—-]+$/g, "");
  return stripped || name;
}

/**
 * A break of a fortnight is not a travel day. Two weeks with no show means the
 * band went home, and a tour that resumes afterward is a second leg.
 */
export const LEG_BREAK_DAYS = 14;

export type Leg = { start: string; end: string; dates: string[] };

/**
 * Split a tour into the legs it was actually played in.
 *
 * A bar drawn from a tour's first date to its last is an *envelope*, not a
 * record: Summer Tour 2026 runs Jun 13 → Sep 2, but the band played the east
 * coast to Jul 4, went home for forty days, and picked the west coast up on Aug
 * 13. Drawn as one bar it claims twelve solid weeks of touring, six of which
 * didn't happen. This isn't an edge case — 19 of 42 tours have a break of two
 * weeks or more inside them, and Fall Tour 2017 has a 49-day one.
 *
 * So the bar shows when they actually played, and the gap between legs is left
 * empty, because that's what it was.
 */
export function splitLegs(dates: string[], breakDays = LEG_BREAK_DAYS): Leg[] {
  const sorted = [...dates].sort();
  if (sorted.length === 0) return [];
  const legs: Leg[] = [];
  let current: string[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const gap = (Date.parse(sorted[i]) - Date.parse(sorted[i - 1])) / 864e5;
    if (gap >= breakDays) {
      legs.push({ start: current[0], end: current[current.length - 1], dates: current });
      current = [];
    }
    current.push(sorted[i]);
  }
  legs.push({ start: current[0], end: current[current.length - 1], dates: current });
  return legs;
}

/** Greedy interval packing: a tour drops into the first lane it doesn't collide
 * with. Most years need one lane; 2018 and 2024 have overlapping runs and need
 * two, which a single-track timeline would have silently drawn on top of itself. */
function packLanes(tours: TourSpan[]): TourSpan[][] {
  const lanes: TourSpan[][] = [];
  for (const t of [...tours].sort((a, b) => a.start.localeCompare(b.start))) {
    const lane = lanes.find((l) => l[l.length - 1].end < t.start);
    if (lane) lane.push(t);
    else lanes.push([t]);
  }
  return lanes;
}

export function TourTimeline({
  tours,
  untouredShows,
  today,
  edition,
}: {
  tours: TourSpan[];
  untouredShows: number;
  today: string;
  edition: Experience;
}) {
  // 3.0 draws the same calendar out of the tape deck: no boxed rows, rounded
  // legs, a dot per show instead of a tick, the busiest run outlined in sale,
  // future legs dashed frost, and names only where they fit (screen-reader
  // only below sm). Every 2.0 literal below is kept on its own branch.
  const yeti = edition === "fancy";
  if (tours.length === 0) return null;

  const byYear = new Map<number, TourSpan[]>();
  for (const t of tours) {
    const y = Number(t.start.slice(0, 4));
    byYear.set(y, [...(byYear.get(y) ?? []), t]);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  const busiest = tours.reduce((a, b) => (b.shows > a.shows ? b : a), tours[0]);

  return (
    <figure className="m-0">
      {/* Month scale, once at the top — every row is read against it. */}
      <div className="mb-1 flex pl-10">
        <div className="relative h-4 flex-1">
          {MONTHS.map((m, i) => (
            <span
              key={i}
              className="absolute top-0 font-mono text-[0.58rem] text-faint"
              style={{ left: `${(i / 12) * 100}%` }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      <ol className="flex flex-col gap-1.5">
        {years.map((year) => {
          const lanes = packLanes(byYear.get(year) ?? []);
          const days = yearDays(year);
          return (
            <li key={year} className="flex items-stretch gap-2">
              <span className="w-8 shrink-0 pt-0.5 text-right font-mono text-[0.7rem] tabular-nums text-muted">
                {year}
              </span>
              <div
                className={yeti ? "@container relative flex-1" : "relative flex-1 rounded-[2px] border border-line-soft bg-bg-deep"}
                style={{ height: lanes.length * LANE.h + (lanes.length - 1) * LANE.gap + 4 }}
              >
                {/* Month gridlines — the quiet months are only legible against them. */}
                {MONTHS.map((_, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className={yeti ? "absolute top-0 h-full w-px bg-line opacity-55" : "absolute top-0 h-full w-px bg-line-soft"}
                    style={{ left: `${(i / 12) * 100}%` }}
                  />
                ))}

                {lanes.map((lane, li) => {
                  // Each tour's extent on the year, legs and connector included,
                  // so 3.0 can print a name in the open lane beside it.
                  const spans = lane.map((t) => {
                    const ls = splitLegs(t.dates);
                    const first = dayOfYear(ls[0]?.start ?? t.start);
                    const ends = ls.map((l) => {
                      const from = dayOfYear(l.start);
                      return (from / days) * 100 + Math.max(((dayOfYear(l.end) - from + 1) / days) * 100, 0.7);
                    });
                    return { start: (first / days) * 100, end: Math.max(...ends, (first / days) * 100) };
                  });
                  const names = yeti ? yetiLaneNames(lane.map((t) => shortName(t.name)), spans) : [];
                  return lane.map((t, ti) => {
                    const legs = splitLegs(t.dates);
                    const future = t.start > today;
                    const hot = t.tourId === busiest.tourId;
                    // Marks (the connector, the bar, its ticks) read the busiest run in
                    // hand; the tour-name label is text, so it stays in ember — hand is
                    // a mark-only color, never text (see the role table in README).
                    const markColor = future ? "var(--faint)" : hot ? "var(--hand)" : "var(--steel)";
                    // The label sits on its own bar's tinted wash (22%/30% color-mix over
                    // --bg-deep), not on plain paper — a computed background the standing
                    // contrast gate (app/globals-contrast.test.ts) can't see, since it only
                    // reads :root hex literals. Measured (scratchpad script, CSS Color 4
                    // srgb math + WCAG luminance): on the old light and dark pages plain
                    // --steel/--ember on that wash fell below the site's 4.5:1 text floor,
                    // and mixing 30% toward --ink cleared it. Since round 2 (2026-11-19)
                    // 3.0 doesn't use this recipe: its labels are plain --ink / --ember
                    // on the YETI_LEG washes, set where the label is drawn. See
                    // tour-timeline-label-contrast.test.ts, which recomputes both.
                    //
                    // Functional doesn't clear with that same recipe: its gel-blue --steel
                    // and its darkened --ember pull further from --ink, so the identical
                    // 70/30 mix lands at 4.10:1 (steel wash) / 3.69:1 (hand wash) — both
                    // fail AA. Plain --ink on those washes clears at 6.95:1 / 6.19:1, so
                    // functional gets its own literal via the CSS override below
                    // ([data-experience="functional"] .tour-timeline-label) rather than
                    // the mix recipe. The --tour-label-color custom property carries the
                    // label color; the class lets the functional rule out-specificity it
                    // without an inline !important.
                    const nameColor = future
                      ? "var(--faint)"
                      : hot
                        ? "color-mix(in srgb, var(--ember) 70%, var(--ink) 30%)"
                        : "color-mix(in srgb, var(--steel) 70%, var(--ink) 30%)";
                    const top = 2 + li * (LANE.h + LANE.gap);
                    const pct = (iso: string) => (dayOfYear(iso) / days) * 100;

                    return (
                      <Fragment key={t.tourId}>
                        {/* One tour, but only the weeks it was actually played.
                            The connector says the legs belong together; the empty
                            space between them says the band was home. */}
                        {legs.length > 1 && (
                          <span
                            aria-hidden
                            className="absolute"
                            style={{
                              left: `${pct(legs[0].end)}%`,
                              width: `${pct(legs[legs.length - 1].start) - pct(legs[0].end)}%`,
                              top: top + LANE.h / 2,
                              height: 1,
                              borderTop: `1px dotted ${markColor}`,
                              opacity: 0.45,
                            }}
                          />
                        )}

                        {legs.map((leg, i) => {
                          const from = dayOfYear(leg.start);
                          const to = dayOfYear(leg.end);
                          const width = Math.max(((to - from + 1) / days) * 100, 0.7);
                          return (
                            <Link
                              key={leg.start}
                              href={`/tours/${t.tourId}`}
                              title={`${t.name} — ${t.start} to ${t.end}, ${t.shows} ${t.shows === 1 ? "show" : "shows"}${legs.length > 1 ? ` · leg ${i + 1} of ${legs.length}: ${leg.start} to ${leg.end}, ${leg.dates.length} shows` : ""}${t.upcoming ? ` (${t.upcoming} still ahead)` : ""}`}
                              className={
                                yeti
                                  ? "group absolute flex items-center overflow-hidden rounded-full transition"
                                  : "group absolute flex items-center rounded-[2px] transition"
                              }
                              style={yeti ? {
                                left: `${(from / days) * 100}%`,
                                width: `max(10px, ${width}%)`,
                                top,
                                height: LANE.h,
                                background: future
                                  ? "transparent"
                                  : `color-mix(in srgb, var(${hot ? "--hand" : "--steel"}) ${hot ? YETI_LEG.handWash : YETI_LEG.steelWash}%, transparent)`,
                                border: future
                                  ? "1.5px dashed var(--line)"
                                  : hot
                                    ? "1.5px solid var(--hand)"
                                    : "1px solid color-mix(in srgb, var(--steel) 55%, transparent)",
                              } : {
                                left: `${(from / days) * 100}%`,
                                width: `${width}%`,
                                top,
                                height: LANE.h,
                                background: future
                                  ? "transparent"
                                  : hot
                                    ? "color-mix(in srgb, var(--hand) 30%, transparent)"
                                    : "color-mix(in srgb, var(--steel) 22%, transparent)",
                                border: `1px solid ${future ? "var(--line)" : hot ? "var(--hand)" : "color-mix(in srgb, var(--steel) 55%, transparent)"}`,
                                borderStyle: future ? "dashed" : "solid",
                              }}
                            >
                              {leg.dates.map((d, di) => {
                                const at = ((dayOfYear(d) - from) / Math.max(to - from + 1, 1)) * 100;
                                return (
                                  <span
                                    // doubleheaders repeat a date (2022-07-22, 2020-02-29) — the date alone is not unique
                                    key={`${d}·${di}`}
                                    aria-hidden
                                    className={yeti ? "absolute bottom-[4px] -ml-[1.5px] h-[3px] w-[3px] rounded-full" : "absolute bottom-[2px] h-[5px] w-px"}
                                    style={{
                                      left: `${Math.min(at, 99)}%`,
                                      background: d > today ? "var(--faint)" : hot ? "var(--hand)" : "var(--steel)",
                                    }}
                                  />
                                );
                              })}
                              {/* The name rides the first leg only — repeating it
                                  on every leg would read as separate tours. */}
                              {/* 3.0 prints the name beside the bars (below); inside, the
                                  link keeps it for screen readers. */}
                              {i === 0 && yeti && <span className="sr-only">{t.name}</span>}
                              {i === 0 && !yeti && (
                                <span
                                  className="tour-timeline-label pointer-events-none absolute left-0 right-0 top-[3px] z-10 mx-1.5 truncate font-mono text-[0.6rem] leading-none"
                                  style={{ "--tour-label-color": nameColor } as CSSProperties}
                                >
                                  {shortName(t.name)}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                        {yeti && (() => {
                          const span = spans[ti];
                          const place = names[ti];
                          if (!place) return null;
                          return (
                            <span
                              aria-hidden
                              className={`tour-timeline-label pointer-events-none absolute z-10 -translate-y-1/2 whitespace-nowrap font-display text-[0.75rem] font-extrabold leading-none max-sm:hidden ${place.hide}`.trim()}
                              style={
                                {
                                  top: top + LANE.h / 2,
                                  ...(place.side === "right"
                                    ? { left: `calc(${span.end}% + 6px)` }
                                    : { right: `calc(${100 - span.start}% + 6px)` }),
                                  "--tour-label-color": future
                                    ? YETI_NAME_COLOR.future
                                    : hot
                                      ? YETI_NAME_COLOR.hot
                                      : YETI_NAME_COLOR.plain,
                                } as Record<string, string | number> as CSSProperties
                              }
                            >
                              {shortName(t.name)}
                            </span>
                          );
                        })()}
                      </Fragment>
                    );
                  });
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <figcaption className="mt-3 font-mono text-[0.62rem] leading-relaxed text-faint">
        {yeti ? (
          <>
            Each bar is the weeks a tour was actually played, with a dot for every show. A tour with a break of two
            weeks or more is drawn as separate legs joined by a dotted line — the band went home, and a solid bar
            through that gap would claim touring that didn&apos;t happen. Dashed bars haven&apos;t happened yet. The
            busiest run, <span className="text-ember">{busiest.name}</span> at {busiest.shows} shows, is outlined in
            yellow.{" "}
          </>
        ) : (
          <>
            Each bar is the weeks a tour was actually played, and every tick inside it is a show. A tour with a break of
            two weeks or more is drawn as separate legs joined by a dotted line — the band went home, and a solid bar
            through that gap would claim touring that didn&apos;t happen. Dashed bars haven&apos;t happened yet. The busiest
            run — <span className="text-ember">{busiest.name}</span>, {busiest.shows} shows — is marked.{" "}
          </>
        )}
        {untouredShows > 0 && (
          <>
            {untouredShows} shows belong to no tour at all and aren&apos;t drawn here: one-offs, festivals and sit-ins
            that elgoose files under a placeholder rather than a run.
          </>
        )}
      </figcaption>
    </figure>
  );
}

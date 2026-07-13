import { Fragment } from "react";
import Link from "next/link";
import type { TourSpan } from "@/lib/queries/dimensions";

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

const dayOfYear = (iso: string) => {
  const d = new Date(iso + "T00:00:00Z");
  const jan1 = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.floor((d.getTime() - jan1) / 864e5);
};
const yearDays = (year: number) => (new Date(Date.UTC(year, 1, 29)).getUTCDate() === 29 ? 366 : 365);

/** The row already says the year and the axis already says "tour", so a bar
 * labelled "Summer Tour 2026" spends its width repeating its own coordinates.
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
 * band went home, and a tour that resumes afterwards is a second leg.
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
}: {
  tours: TourSpan[];
  untouredShows: number;
  today: string;
}) {
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
                className="relative flex-1 rounded-[2px] border border-line-soft bg-bg-deep"
                style={{ height: lanes.length * LANE.h + (lanes.length - 1) * LANE.gap + 4 }}
              >
                {/* Month gridlines — the quiet months are only legible against them. */}
                {MONTHS.map((_, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute top-0 h-full w-px bg-line-soft"
                    style={{ left: `${(i / 12) * 100}%` }}
                  />
                ))}

                {lanes.map((lane, li) =>
                  lane.map((t) => {
                    const legs = splitLegs(t.dates);
                    const future = t.start > today;
                    const hot = t.tourId === busiest.tourId;
                    const colour = future ? "var(--faint)" : hot ? "var(--ember)" : "var(--gold)";
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
                              borderTop: `1px dotted ${colour}`,
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
                              className="group absolute flex items-center rounded-[2px] transition"
                              style={{
                                left: `${(from / days) * 100}%`,
                                width: `${width}%`,
                                top,
                                height: LANE.h,
                                background: future
                                  ? "transparent"
                                  : hot
                                    ? "color-mix(in srgb, var(--ember) 30%, transparent)"
                                    : "color-mix(in srgb, var(--gold) 22%, transparent)",
                                border: `1px solid ${future ? "var(--line)" : hot ? "var(--ember)" : "color-mix(in srgb, var(--gold) 55%, transparent)"}`,
                                borderStyle: future ? "dashed" : "solid",
                              }}
                            >
                              {leg.dates.map((d) => {
                                const at = ((dayOfYear(d) - from) / Math.max(to - from + 1, 1)) * 100;
                                return (
                                  <span
                                    key={d}
                                    aria-hidden
                                    className="absolute bottom-[2px] h-[5px] w-px"
                                    style={{
                                      left: `${Math.min(at, 99)}%`,
                                      background: d > today ? "var(--faint)" : hot ? "var(--ember)" : "var(--gold)",
                                    }}
                                  />
                                );
                              })}
                              {/* The name rides the first leg only — repeating it
                                  on every leg would read as separate tours. */}
                              {i === 0 && (
                                <span
                                  className="pointer-events-none absolute left-0 right-0 top-[3px] z-10 mx-1.5 truncate font-mono text-[0.6rem] leading-none"
                                  style={{ color: colour }}
                                >
                                  {shortName(t.name)}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </Fragment>
                    );
                  }),
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <figcaption className="mt-3 font-mono text-[0.62rem] leading-relaxed text-faint">
        Each bar is the weeks a tour was actually played, and every tick inside it is a show. A tour with a break of
        two weeks or more is drawn as separate legs joined by a dotted line — the band went home, and a solid bar
        through that gap would claim touring that didn&apos;t happen. Dashed bars haven&apos;t happened yet. The busiest
        run — <span className="text-ember">{busiest.name}</span>, {busiest.shows} shows — is marked.{" "}
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

import Link from "@/app/_components/link";
import type { TourRun } from "@/lib/queries/dimensions";
import type { ShowSummary } from "@/lib/queries/shows";
import { locationLine, showHref } from "@/lib/queries/format";
import { LabelSticker, PlainTag } from "@/app/_components/yeti";
import { LEG_BREAK_DAYS } from "@/app/_components/tour-timeline";
import { chromeLink } from "@/app/_components/page-chrome";
import { clsx } from "@/app/_components/clsx";
import {
  dayLabel,
  ringArcs,
  runPlace,
  runRoute,
  shelveTours,
  spanLabel,
  weeksOut,
  type Arc,
  type RunPlace,
} from "./shelf";

/* 3.0's tours, as Yeti would shelve them (spec 2026-11-18, round 3). Server
 * components; 2.0 and 1.0 never render these. */

// ── The year ring ─────────────────────────────────────────────────────────────

const RING = { c: 50, r: 38, w: 5 } as const;
/** A one-night run still gets a visible dot of arc. */
const MIN_ARC = 0.008;

function arcPath(from: number, to: number): string {
  const a1 = Math.min(Math.max(to, from + MIN_ARC), from + 0.995);
  const p = (f: number) => {
    const t = ((f * 360 - 90) * Math.PI) / 180;
    return `${(RING.c + RING.r * Math.cos(t)).toFixed(2)} ${(RING.c + RING.r * Math.sin(t)).toFixed(2)}`;
  };
  return `M${p(from)} A${RING.r} ${RING.r} 0 ${a1 - from > 0.5 ? 1 : 0} 1 ${p(a1)}`;
}

const ARC_STYLE: Record<Arc["kind"], { stroke: string; opacity?: number }> = {
  past: { stroke: "var(--steel)" },
  // Foil is elapsed time: only a run in progress, up to today.
  played: { stroke: "var(--foil)" },
  ahead: { stroke: "var(--steel)", opacity: 0.45 },
};

/** A run's year as a ring, the pill's own form: January at the top, running
 * clockwise, the legs lit. Every ring is one year, so an eleven-week summer is
 * a long arc and a two-week leg a short one. The center carries the count. */
export function YearRing({ arcs, big, small }: { arcs: Arc[]; big: string; small: string }) {
  return (
    <svg viewBox="0 0 100 100" className="block h-[86%] w-[86%]" aria-hidden="true">
      <circle cx={RING.c} cy={RING.c} r={RING.r} fill="none" stroke="var(--frost)" strokeWidth={RING.w} />
      {/* January 1, at the top. */}
      <line x1={50} y1={6} x2={50} y2={11} stroke="var(--steel)" strokeOpacity={0.5} strokeWidth={1.2} strokeLinecap="round" />
      {arcs.map((a, i) => (
        <path
          key={i}
          data-arc={a.kind}
          d={arcPath(a.from, a.to)}
          fill="none"
          stroke={ARC_STYLE[a.kind].stroke}
          strokeOpacity={ARC_STYLE[a.kind].opacity}
          strokeWidth={RING.w}
          strokeLinecap="round"
        />
      ))}
      <text x={50} y={52} textAnchor="middle" fontSize={22} fontWeight={900} fill="var(--ink)" style={{ fontVariantNumeric: "tabular-nums" }}>
        {big}
      </text>
      <text x={50} y={65} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--muted)">
        {small}
      </text>
    </svg>
  );
}

/** The ring printed on card stock: flat with a frost keyline, as Yeti's video
 * posters sit (the blister pack stays on tonight's show). */
function RingFace({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={clsx(
        "grid aspect-square place-items-center rounded-[14px] bg-[var(--card-stock)] shadow-[inset_0_0_0_1px_var(--frost)]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

function runCenter(run: TourRun, place: RunPlace | null): { big: string; small: string } {
  if (!place) return { big: String(run.shows), small: run.shows === 1 ? "show" : "shows" };
  if (place.kind === "tonight") return { big: String(place.show), small: `of ${run.shows} · tonight` };
  return { big: String(place.played), small: `of ${run.shows} played` };
}

// ── A tile in the crate ───────────────────────────────────────────────────────

export function TourTile({ run, today }: { run: TourRun; today: string }) {
  const route = runRoute(run.places);
  const weeks = run.shows === 1 ? "one night" : `${weeksOut(run.start, run.end)} wk`;
  return (
    <Link href={`/tours/${run.tourId}`} className="tour-tile group grid min-w-0 snap-start content-start gap-0.5">
      <RingFace className="mb-1.5">
        <YearRing arcs={ringArcs(run.dates, today, false)} {...runCenter(run, null)} />
      </RingFace>
      <b className="truncate text-[0.9rem] font-extrabold text-ink underline-offset-4 group-hover:underline">{run.name}</b>
      <span className="truncate text-[0.8rem] text-muted">
        {spanLabel(run.start, run.end)} · {weeks}
      </span>
      {route.first && (
        <span className="truncate text-[0.8rem] text-faint">
          {route.first === route.last ? route.first : `${route.first} → ${route.last}`}
        </span>
      )}
    </Link>
  );
}

// ── Queue rows: Yeti's "coming up next" ───────────────────────────────────────

type RowState = "played" | "tonight" | "ahead";

export function ShowRow({ show, n, state }: { show: ShowSummary; n?: number; state: RowState }) {
  const where = locationLine(show.city, show.state, show.country);
  return (
    <li>
      <Link
        href={showHref(show.date, show.order)}
        className={clsx(
          "group grid items-center gap-x-2.5 border-t border-line py-2.5",
          n != null ? "grid-cols-[1.5rem_3.6rem_minmax(0,1fr)_auto]" : "grid-cols-[3.6rem_minmax(0,1fr)_auto]",
          state === "tonight" && "-mx-2 rounded-[8px] bg-[rgba(242,226,122,0.07)] px-2",
        )}
      >
        {n != null && <span className="text-right text-[0.75rem] tabular-nums text-faint">{n}</span>}
        <span className={clsx("text-[0.9rem] font-extrabold", state === "ahead" ? "text-muted" : "text-ink")}>
          {dayLabel(show.date)}
        </span>
        <span className="grid min-w-0">
          <b
            className={clsx(
              "truncate text-[0.92rem] font-extrabold underline-offset-4 group-hover:underline",
              state === "ahead" ? "text-muted" : "text-ink",
            )}
          >
            {show.venue ?? "Venue unknown"}
          </b>
          {where && <span className="truncate text-[0.8rem] text-muted">{where}</span>}
        </span>
        {state === "tonight" ? (
          <LabelSticker>Tonight</LabelSticker>
        ) : state === "played" && show.songCount > 0 ? (
          <span className="text-[0.8rem] tabular-nums text-faint">{plural(show.songCount, "song")}</span>
        ) : (
          <span />
        )}
      </Link>
    </li>
  );
}

const rowState = (date: string, today: string): RowState => (date === today ? "tonight" : date > today ? "ahead" : "played");

function ShelfHead({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 mt-10 text-[1.35rem] font-black tracking-[-0.005em] text-ink">{children}</h2>;
}
function ListHead({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-1.5 mt-4 text-[0.875rem] font-extrabold text-muted first:mt-0">{children}</h3>;
}

function placeLine(place: RunPlace, run: TourRun, shows: ShowSummary[]): string {
  const tonight = place.kind === "tonight" ? shows[place.show - 1] : null;
  const played = `${place.played} of ${run.shows} played`;
  if (place.kind === "tonight") return `${played} · show ${place.show} is tonight${tonight?.city ? ` in ${tonight.city}` : ""}`;
  if (place.kind === "home") return `${played} · home until ${dayLabel(place.until)}`;
  return `${played} · a night off`;
}

// ── /tours ────────────────────────────────────────────────────────────────────

export function ToursShelf({
  runs,
  today,
  runningShows,
  oneOffs,
}: {
  runs: TourRun[];
  today: string;
  /** Every show of the running tour, oldest first (empty when nothing is running). */
  runningShows: ShowSummary[];
  /** Upcoming shows filed under no run. */
  oneOffs: ShowSummary[];
}) {
  const { running, upcoming, justBack, crate } = shelveTours(runs, today);
  const byYear = new Map<number, TourRun[]>();
  for (const r of crate) {
    const y = Number(r.start.slice(0, 4));
    byYear.set(y, [...(byYear.get(y) ?? []), r]);
  }

  return (
    <>
      {running && <OnTheRoad run={running} shows={runningShows} today={today} />}

      {(upcoming.length > 0 || oneOffs.length > 0) && (
        <section>
          <ShelfHead>Coming up</ShelfHead>
          <div className="grid gap-6 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:gap-9">
            {upcoming.length > 0 && (
              <div className="grid max-w-[160px] gap-5 sm:max-w-none">
                {upcoming.map((r) => (
                  <UpcomingTile key={r.tourId} run={r} today={today} />
                ))}
              </div>
            )}
            {oneOffs.length > 0 && (
              <div className={upcoming.length === 0 ? "sm:col-span-2" : undefined}>
                <ListHead>Not on a tour</ListHead>
                <ol>
                  {oneOffs.map((s) => (
                    <li key={s.showId}>
                      <Link
                        href={showHref(s.date, s.order)}
                        className="group grid grid-cols-[3.6rem_minmax(0,1fr)_auto] items-center gap-x-2.5 border-t border-line py-2.5"
                      >
                        <span className="text-[0.9rem] font-extrabold text-muted">{dayLabel(s.date)}</span>
                        <span className="grid min-w-0">
                          <b className="truncate text-[0.92rem] font-extrabold text-muted underline-offset-4 group-hover:underline">
                            {s.venue ?? "Venue unknown"}
                          </b>
                          <span className="truncate text-[0.8rem] text-muted">{locationLine(s.city, s.state, s.country)}</span>
                        </span>
                        <PlainTag>one-off</PlainTag>
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </section>
      )}

      {justBack && <JustBack run={justBack} today={today} />}

      <section>
        <ShelfHead>The crate</ShelfHead>
        <p className="mb-1 max-w-[70ch] text-[0.85rem] text-muted">
          Every run the band has made, newest first. Each ring is its year, January at the top and running clockwise;
          the lit arcs are when the band was out, so an eleven-week summer is a long arc and a two-week leg a short
          one.
        </p>
        {[...byYear.entries()].map(([year, rs]) => (
          <div key={year}>
            <h3 className="mb-2.5 mt-6 text-[1.1rem] font-black text-muted">
              <Link href={`/years/${year}`} className="underline-offset-4 hover:underline">
                {year}
              </Link>
            </h3>
            <div className="-mx-5 grid snap-x snap-mandatory scroll-px-5 auto-cols-[132px] grid-flow-col gap-3.5 overflow-x-auto px-5 pb-1.5 [scrollbar-width:none] sm:mx-0 sm:grid-flow-row sm:grid-cols-4 sm:gap-x-4 sm:gap-y-6 sm:overflow-visible sm:px-0 lg:grid-cols-6">
              {rs.map((r) => (
                <TourTile key={r.tourId} run={r} today={today} />
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}

function UpcomingTile({ run, today }: { run: TourRun; today: string }) {
  const route = runRoute(run.places);
  return (
    <Link href={`/tours/${run.tourId}`} className="group grid min-w-0 content-start gap-0.5">
      <RingFace className="mb-1.5">
        <YearRing arcs={ringArcs(run.dates, today, false)} {...runCenter(run, null)} />
      </RingFace>
      <b className="truncate text-[0.95rem] font-extrabold text-ink underline-offset-4 group-hover:underline">{run.name}</b>
      <span className="text-[0.8rem] text-muted">
        {spanLabel(run.start, run.end)}, {run.start.slice(0, 4)}
      </span>
      {route.first && (
        <span className="truncate text-[0.8rem] text-faint">
          {route.first === route.last ? route.first : `${route.first} → ${route.last}`}
        </span>
      )}
    </Link>
  );
}

function OnTheRoad({ run, shows, today }: { run: TourRun; shows: ShowSummary[]; today: string }) {
  const place = runPlace(run.dates, today);
  const route = runRoute(run.places);
  const tonight = shows.filter((s) => s.date === today);
  const ahead = shows.filter((s) => s.date > today).slice(0, 3);
  const played = shows.filter((s) => s.date < today).slice(-3).reverse();
  const number = new Map(shows.map((s, i) => [s.showId, i + 1]));

  return (
    <section>
      <ShelfHead>On the road</ShelfHead>
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-9">
        <div className="grid grid-cols-[116px_minmax(0,1fr)] items-center gap-4 lg:grid-cols-1 lg:items-start">
          <Link href={`/tours/${run.tourId}`} aria-label={run.name}>
            <RingFace>
              <YearRing arcs={ringArcs(run.dates, today, true)} {...runCenter(run, place)} />
            </RingFace>
          </Link>
          <div className="grid min-w-0 gap-0.5">
            <Link href={`/tours/${run.tourId}`} className="text-[1.35rem] font-black leading-tight text-ink underline-offset-4 hover:underline">
              {run.name}
            </Link>
            <span className="text-[0.82rem] text-muted">
              {route.first && route.last ? `${route.first} → ${route.last} · ` : ""}
              {spanLabel(run.start, run.end)}
            </span>
            <span className="text-[0.82rem] text-muted">{placeLine(place, run, shows)}</span>
          </div>
        </div>
        <div>
          {tonight.length > 0 && (
            <>
              <ListHead>Tonight</ListHead>
              <ol>
                {tonight.map((s) => (
                  <ShowRow key={s.showId} show={s} n={number.get(s.showId)} state="tonight" />
                ))}
              </ol>
            </>
          )}
          {ahead.length > 0 && (
            <>
              <ListHead>Coming up next</ListHead>
              <ol>
                {ahead.map((s) => (
                  <ShowRow key={s.showId} show={s} n={number.get(s.showId)} state="ahead" />
                ))}
              </ol>
            </>
          )}
          {played.length > 0 && (
            <>
              <ListHead>Just played</ListHead>
              <ol>
                {played.map((s) => (
                  <ShowRow key={s.showId} show={s} n={number.get(s.showId)} state="played" />
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function JustBack({ run, today }: { run: TourRun; today: string }) {
  const route = runRoute(run.places);
  const rows: [string, string][] = [
    ["shows", route.cities ? `${run.shows}, in ${plural(route.cities, "city", "cities")}` : String(run.shows)],
    ["out for", plural(weeksOut(run.start, run.end), "week")],
    ...(route.first && route.last ? ([["route", `${route.first} → ${route.last}`]] as [string, string][]) : []),
  ];
  return (
    <section>
      <ShelfHead>Just back</ShelfHead>
      <div className="grid gap-6 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:gap-9">
        <div className="max-w-[160px] sm:max-w-none">
          <TourTile run={run} today={today} />
        </div>
        <dl className="m-0">
          {rows.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[6rem_minmax(0,1fr)] gap-3 border-t border-line py-2 text-[0.9rem]">
              <dt className="font-extrabold text-muted">{k}</dt>
              <dd className="m-0 text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ── /tours/[id] ───────────────────────────────────────────────────────────────

export function TourPageYeti({
  name,
  shows,
  today,
}: {
  name: string;
  /** The tour's shows, oldest first. */
  shows: ShowSummary[];
  today: string;
}) {
  const dates = shows.map((s) => s.date);
  const start = dates[0];
  const end = dates[dates.length - 1];
  const running = !!start && start <= today && today <= end;
  const place = running ? runPlace(dates, today) : null;
  const places = shows.map((s) => locationLine(s.city, s.state, s.country) || null);
  const route = runRoute(places);
  const run: TourRun = { tourId: 0, name, start, end, shows: shows.length, upcoming: 0, dates, places };
  const legs = splitShowLegs(shows);
  const counts = [
    plural(shows.length, "show"),
    route.cities ? plural(route.cities, "city", "cities") : null,
    start ? `${spanLabel(start, end)}, ${end.slice(0, 4)}` : null,
    legs.length > 1 ? `${legs.length} legs` : null,
  ].filter(Boolean);

  let n = 0;
  return (
    <>
      {/* Yeti's artist page: the name as the large title, the counts under it
          as plain type, beside the run's year ring. */}
      <header className="mb-7 grid grid-cols-[104px_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-7">
        {start ? (
          <RingFace>
            <YearRing arcs={ringArcs(dates, today, running)} {...runCenter(run, place)} />
          </RingFace>
        ) : (
          <span />
        )}
        <div className="min-w-0">
          <p className="text-[0.75rem] lowercase text-faint">
            <Link href="/tours" className={chromeLink}>
              tours
            </Link>
          </p>
          <h1 className="page-head-title mt-1 text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {name}
          </h1>
          <p className="mt-2 text-[0.85rem] text-muted">{counts.join(" · ")}</p>
          {place && <p className="mt-1 text-[0.85rem] text-muted">{placeLine(place, run, shows)}</p>}
        </div>
      </header>
      <div className={clsx("grid gap-2", legs.length === 2 && "lg:grid-cols-2 lg:items-start lg:gap-9")}>
        {legs.map((leg, li) => (
          <div key={leg[0].showId}>
            {legs.length > 1 && (
              <h2 className="mb-1.5 mt-3.5 text-[1rem] font-black text-muted">
                Leg {li + 1} · {spanLabel(leg[0].date, leg[leg.length - 1].date)} · {plural(leg.length, "show")}
                {li > 0 && ` · after ${daysBetween(legs[li - 1][legs[li - 1].length - 1].date, leg[0].date)} days home`}
              </h2>
            )}
            <ol>
              {leg.map((s) => {
                n += 1;
                return <ShowRow key={s.showId} show={s} n={n} state={rowState(s.date, today)} />;
              })}
            </ol>
          </div>
        ))}
      </div>
    </>
  );
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);

/** The tour's shows in legs, split where the band went home for two weeks or
 * more (the timeline's rule, `LEG_BREAK_DAYS`). */
function splitShowLegs(shows: ShowSummary[]): ShowSummary[][] {
  const legs: ShowSummary[][] = [];
  for (const s of shows) {
    const leg = legs[legs.length - 1];
    if (leg && daysBetween(leg[leg.length - 1].date, s.date) < LEG_BREAK_DAYS) leg.push(s);
    else legs.push([s]);
  }
  return legs;
}

import Link from "next/link";
import type { SongPerf, SongStat } from "@/lib/queries/songs";
import { showHref, formatShortDate } from "@/lib/queries/format";
import { PlainTag } from "@/app/_components/yeti";
import { Flame } from "@/app/_components/marks";
import { chromeLink } from "@/app/_components/page-chrome";
import { clsx } from "@/app/_components/clsx";
import { gapFraction, goneForRecord, songRun, type YearShare } from "./run";

/* 3.0's song page, as Yeti would read a track (spec 2026-11-18, round 5).
 * Server components; 2.0 and 1.0 keep their own song page. */

const low = (iso: string) => formatShortDate(iso).toLowerCase();
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 mt-9 text-[1.3rem] font-black tracking-[-0.005em] text-ink">{children}</h2>;
}

// ── The gap ring: how long since, against the song's own longest ──────────────

function GapRing({ current, longest }: { current: number; longest: number | null }) {
  const f = gapFraction(current, longest);
  const record = goneForRecord(current, longest);
  const r = 40;
  const end = Math.max(Math.min(f, 0.995), 0.012);
  const a = ((end * 360 - 90) * Math.PI) / 180;
  return (
    <svg viewBox="0 0 100 100" className="block h-[86%] w-[86%]" aria-hidden="true">
      {record && <circle data-role="record" cx={50} cy={50} r={46.5} fill="none" stroke="var(--foil)" strokeOpacity={0.32} strokeWidth={1.2} />}
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--frost)" strokeWidth={5} />
      {f > 0 && (
        <path
          data-role="gap"
          d={`M50 10 A${r} ${r} 0 ${end > 0.5 ? 1 : 0} 1 ${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`}
          fill="none"
          stroke="var(--foil)"
          strokeWidth={5}
          strokeLinecap="round"
        />
      )}
      <text x={50} y={53} textAnchor="middle" fontSize={25} fontWeight={900} fill="var(--ink)" style={{ fontVariantNumeric: "tabular-nums" }}>
        {current}
      </text>
      <text x={50} y={66} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--muted)">
        {current === 1 ? "show since" : "shows since"}
      </text>
    </svg>
  );
}

function GoneLine({ song }: { song: SongStat }) {
  const cur = song.currentGap ?? 0;
  const avg = song.avgGap != null ? `${song.avgGap}` : null;
  if (goneForRecord(song.currentGap, song.longestGap)) {
    return (
      <p className="text-[0.88rem] leading-relaxed text-muted">
        <b className="font-extrabold text-[var(--foil)]">Gone {plural(cur, "show")}, longer than ever.</b> Its longest gap
        before this was {song.longestGap}
        {avg ? `; it usually comes back after ${avg}` : ""}.{" "}
        <PlainTag className="mt-1.5 text-[var(--foil)] shadow-[inset_0_0_0_1px_rgba(255,143,196,0.5)]">
          longest it&apos;s been gone
        </PlainTag>
      </p>
    );
  }
  return (
    <p className="text-[0.88rem] leading-relaxed text-muted">
      {song.lastPlayedDate ? `Last played ${low(song.lastPlayedDate)}.` : ""}
      {avg ? ` It usually comes back after ${avg} shows` : ""}
      {song.longestGap != null ? `${avg ? ";" : ""} its longest gap is ${song.longestGap}.` : avg ? "." : ""}
    </p>
  );
}

// ── Says so on the box ────────────────────────────────────────────────────────

function Spec({ song }: { song: SongStat }) {
  const rows: [string, React.ReactNode][] = [
    ["played", plural(song.timesPlayed, "time")],
    ["rotation", `${song.rotationPct}% of shows since its debut`],
    ...(song.debutDate
      ? ([["debut", <Link key="d" href={showHref(song.debutDate, song.debutOrder)} className={chromeLink}>{low(song.debutDate)}</Link>]] as [string, React.ReactNode][])
      : []),
    ...(song.lastPlayedDate
      ? ([["last played", <Link key="l" href={showHref(song.lastPlayedDate, song.lastOrder)} className={chromeLink}>{low(song.lastPlayedDate)}</Link>]] as [string, React.ReactNode][])
      : []),
    ...(song.avgGap != null ? ([["avg gap", plural(song.avgGap, "show")]] as [string, React.ReactNode][]) : []),
    ...(song.longestGap != null ? ([["longest gap", plural(song.longestGap, "show")]] as [string, React.ReactNode][]) : []),
    ...(song.longestVersions[0] ? ([["longest", song.longestVersions[0].trackTime]] as [string, React.ReactNode][]) : []),
  ];
  return (
    <dl className="m-0">
      {rows.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2.5 border-t border-line py-2 text-[0.92rem]">
          <dt className="font-extrabold text-muted">{k}</dt>
          <dd className="m-0 font-bold text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── The whole run ─────────────────────────────────────────────────────────────

function RunStrip({ song, perfs }: { song: SongStat; perfs: SongPerf[] }) {
  const run = songRun(perfs, song.currentGap);
  const W = 1000;
  const x = (at: number) => (at / run.total) * W;
  const markW = Math.max(1.6, (W / run.total) * 0.7);
  const last = run.marks[run.marks.length - 1]?.at ?? 0;
  const cur = song.currentGap ?? 0;
  return (
    <>
      <svg
        viewBox={`0 0 ${W} 36`}
        preserveAspectRatio="none"
        className="mt-2.5 block h-9 w-full"
        role="img"
        aria-label={`${plural(run.marks.length, "night")} played across ${plural(run.total, "show")} since its debut${cur ? `; ${plural(cur, "show")} since the last` : ""}.`}
      >
        <line x1={0} y1={14} x2={W} y2={14} stroke="var(--frost)" strokeWidth={4} strokeLinecap="round" />
        {run.marks.map((m, i) => (
          <rect
            key={i}
            data-mark={m.returned ? "returned" : "played"}
            x={x(m.at).toFixed(1)}
            y={m.returned ? 6 : 9}
            width={markW.toFixed(1)}
            height={m.returned ? 16 : 10}
            rx={1}
            fill={m.returned ? "var(--hand)" : "var(--steel)"}
          />
        ))}
        {cur > 0 && (
          <line data-role="now" x1={(x(last) + 3).toFixed(1)} y1={14} x2={W - 2} y2={14} stroke="var(--foil)" strokeWidth={4} strokeLinecap="round" />
        )}
        {run.longest && (
          <line
            data-role="longest"
            x1={(x(run.longest.from) + 3).toFixed(1)}
            y1={30}
            x2={(x(run.longest.to) - 1).toFixed(1)}
            y2={30}
            stroke="var(--steel)"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        )}
      </svg>
      <p className="mt-0.5 flex flex-wrap justify-between gap-x-3.5 gap-y-1 text-[0.8rem] text-muted">
        {song.debutDate && <span>debut · {low(song.debutDate)}</span>}
        {song.longestGap != null && run.longest && <span>longest gap · {song.longestGap}, the line under the track</span>}
        <span className="text-[var(--foil)]">now · {cur} since</span>
      </p>
    </>
  );
}

// ── Its years, where it lands, longest versions, where it's played most ───────

function Years({ shares }: { shares: YearShare[] }) {
  return (
    <ul className="mt-2 grid gap-[7px]">
      {shares.map((y) => {
        const f = y.setlists ? Math.min(y.shows / y.setlists, 1) : 0;
        return (
          <li key={y.year} className="grid grid-cols-[2.6rem_minmax(0,1fr)_4.6rem] items-center gap-2.5 text-[0.85rem]">
            <span className="font-extrabold text-muted">{y.year}</span>
            <span data-role="level" className="relative block h-1.5 rounded-full bg-[var(--frost)]" aria-hidden="true">
              <span className="absolute inset-y-0 left-0 rounded-full bg-steel" style={{ width: `${(f * 100).toFixed(1)}%` }} />
            </span>
            <span className="text-right font-extrabold tabular-nums text-ink">
              {y.shows}
              {y.setlists != null && <span className="font-normal text-faint"> of {y.setlists}</span>}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Placement({ p }: { p: SongStat["setPlacement"] }) {
  const segs: [string, number][] = [["set 1", p.set1], ["set 2", p.set2], ["encore", p.encore]];
  return (
    <>
      {/* The three share one whole, so they're one segmented capsule; "opens"
          and "jammed" overlap them, so they're facts beside it. */}
      <div className="flex gap-[3px] rounded-[12px] bg-[var(--night)] p-[3px] shadow-[inset_0_0_0_1px_var(--frost)]">
        {segs.map(([k, v], i) => (
          <span
            key={k}
            data-seg={k}
            className={clsx(
              "grid min-w-[3.4rem] justify-items-center overflow-hidden rounded-[9px] px-1 py-1.5",
              i === 0 ? "bg-[var(--segment-thumb)]" : "bg-[var(--shelf)]",
            )}
            style={{ flex: `${Math.max(v, 1)} 0 0` }}
          >
            <b className="text-[0.8rem] font-extrabold text-ink">{k}</b>
            <span className="text-[0.75rem] tabular-nums text-muted">{v}%</span>
          </span>
        ))}
      </div>
      <p className="mt-2.5 flex flex-wrap gap-2">
        <PlainTag>opens {p.opener}% of the time</PlainTag>
        <PlainTag>jammed {p.jammed}%</PlainTag>
      </p>
    </>
  );
}

function Longest({ versions }: { versions: SongStat["longestVersions"] }) {
  const top = Math.max(1, ...versions.map((v) => v.seconds));
  return (
    <ol>
      {versions.map((v) => (
        <li key={`${v.showId}-${v.seconds}`} className="grid grid-cols-[3.4rem_minmax(0,1fr)] items-center gap-x-3 gap-y-1 border-t border-line py-2">
          <span className="row-span-2 text-[0.95rem] font-black tabular-nums text-ink">{v.trackTime}</span>
          <span className="relative block h-1 rounded-full bg-[var(--frost)]" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 rounded-full bg-steel" style={{ width: `${((v.seconds / top) * 100).toFixed(1)}%` }} />
          </span>
          <Link href={showHref(v.date, v.order)} className="truncate text-[0.8rem] text-muted underline-offset-4 hover:text-ink hover:underline">
            {low(v.date)} · {v.venue ?? "venue unknown"}
          </Link>
        </li>
      ))}
    </ol>
  );
}

function Venues({ venues }: { venues: SongStat["topVenues"] }) {
  return (
    <ol>
      {venues.map((v) => (
        <li key={v.venueId} className="flex justify-between gap-3 border-t border-line py-2 text-[0.88rem] font-bold">
          <Link href={`/venues/${v.venueId}`} className="truncate text-ink underline-offset-4 hover:underline">
            {v.name}
          </Link>
          <span className="tabular-nums text-faint">{v.count}×</span>
        </li>
      ))}
    </ol>
  );
}

// ── Every performance: Yeti's queue rows ──────────────────────────────────────

export function PerfRows({ perfs }: { perfs: SongPerf[] }) {
  return (
    <ol>
      {perfs.map((p) => (
        <li key={p.uniqueId}>
          <Link
            href={showHref(p.date, p.order)}
            className="group grid grid-cols-[3.9rem_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-line py-2.5"
          >
            <span className="grid leading-tight">
              <span className="text-[0.88rem] font-extrabold text-ink">{low(p.date).replace(/, \d{4}$/, "")}</span>
              <span className="text-[0.72rem] font-bold text-faint">{p.date.slice(0, 4)}</span>
            </span>
            <span className="grid min-w-0">
              <b className="truncate text-[0.92rem] font-extrabold text-ink underline-offset-4 group-hover:underline">
                {p.venue ?? "Venue unknown"}
              </b>
              <span className="truncate text-[0.8rem] text-muted">
                {p.setLabel.toLowerCase()}
                {!p.isDustedOff && p.gap != null && p.gap > 0 ? ` · after ${p.gap}` : ""}
              </span>
            </span>
            <span className="flex items-center gap-2 text-[0.8rem]">
              {p.isJamchart && <Flame className="h-4 w-4 text-ember" />}
              {p.isDustedOff && <PlainTag>dusted off · {p.gap}</PlainTag>}
              {p.trackTime && <span className="tabular-nums text-faint">{p.trackTime}</span>}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

// ── The page body ─────────────────────────────────────────────────────────────

export function SongYeti({
  song,
  perfs,
  shares,
  tag,
  appearsOn,
  performances,
}: {
  song: SongStat;
  /** Every performance, newest first (the run needs them all). */
  perfs: SongPerf[];
  shares: YearShare[];
  /** "original", or "cover · Artist". */
  tag: string;
  appearsOn: React.ReactNode;
  /** The paged performance rows and their pager. */
  performances: React.ReactNode;
}) {
  return (
    <>
      <p className="text-[0.75rem] lowercase text-faint">
        <Link href="/songs" className={chromeLink}>
          songs
        </Link>
      </p>
      <h1 className="page-head-title mt-1 text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
        {song.name} <PlainTag className="ml-1 align-middle">{tag}</PlainTag>
      </h1>
      <p className="mt-1.5 text-[0.85rem] text-muted">
        {plural(song.timesPlayed, "play")}
        {song.debutDate ? ` since ${low(song.debutDate)}` : ""}
      </p>
      {appearsOn}

      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-10">
        <div className="grid grid-cols-[120px_minmax(0,1fr)] items-center gap-4 lg:grid-cols-1 lg:items-start">
          <span className="grid aspect-square place-items-center rounded-[16px] bg-[var(--card-stock)] shadow-[inset_0_0_0_1px_var(--frost)]">
            <GapRing current={song.currentGap ?? 0} longest={song.longestGap} />
          </span>
          <GoneLine song={song} />
        </div>
        <div>
          <h2 className="mb-1.5 text-[0.88rem] font-extrabold text-muted">Says so on the box</h2>
          <Spec song={song} />
        </div>
      </div>

      {perfs.length > 0 && (
        <section>
          <H2>The whole run</H2>
          <p className="text-[0.82rem] text-muted">
            Every show since its debut, left to right. A mark is a night it was played (yellow: back from a long
            gap); the empty track is a gap; the pink stretch is the gap still running.
          </p>
          <RunStrip song={song} perfs={perfs} />
        </section>
      )}

      <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-11">
        <div>
          <section>
            <H2>Its years</H2>
            <p className="text-[0.82rem] text-muted">Played at how many of the year&apos;s shows with a setlist.</p>
            <Years shares={shares} />
          </section>
          <section>
            <H2>Where it lands</H2>
            <Placement p={song.setPlacement} />
          </section>
          {song.longestVersions.length > 0 && (
            <section>
              <H2>Longest versions</H2>
              <Longest versions={song.longestVersions} />
            </section>
          )}
          {song.topVenues.length > 0 && (
            <section>
              <H2>Where it&apos;s played most</H2>
              <Venues venues={song.topVenues} />
            </section>
          )}
        </div>
        <section>
          <H2>
            Every performance <span className="text-[0.85rem] font-bold text-faint">· {perfs.length}</span>
          </H2>
          {performances}
        </section>
      </div>
    </>
  );
}

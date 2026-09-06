import Link from "next/link";
import { PenNote } from "@/app/_components/pen";
import { chromeLink } from "@/app/_components/page-chrome";
import { compact } from "@/lib/queries/format";
import { RARITY_MAX_PLAYS } from "@/lib/queries/songs";

/**
 * The catalog, drawn once.
 *
 * Every played song, ranked by how often it has been played, as one stepped
 * profile: a steep head of staples and a long flat tail of songs the band has
 * touched a few times. The six cuts on this page are cuts of this shape, so
 * the shape comes first and the cuts are bracketed onto it.
 *
 * One reading, in the hand's yellow: the rank at which the running total of
 * plays crosses half. It is the most compressed true thing about a rotation —
 * how few songs carry half the nights — and it is computed at render time,
 * like every other number here (copy rule 5).
 *
 * The geometry is an SVG stretched to its box (preserveAspectRatio="none",
 * strokes non-scaling) with every label set in HTML at percentage offsets, so
 * the type stays crisp at any width instead of scaling with the picture.
 */

/** Smallest k such that the top k songs account for at least half of all plays. */
export function halfPoint(plays: number[]): number {
  const total = plays.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  let acc = 0;
  for (let i = 0; i < plays.length; i++) {
    acc += plays[i];
    if (acc * 2 >= total) return i + 1;
  }
  return plays.length;
}

/** Index of the first song played `max` times or fewer. The series is ranked,
 * so everything from here to the end is too. */
export function tailStart(plays: number[], max: number): number {
  const i = plays.findIndex((p) => p <= max);
  return i === -1 ? plays.length : i;
}

/** The profile as a closed step path in a `v`×`v` box. Runs of equal plays
 * collapse to one segment — the tail is mostly ones, and drawing each of them
 * would put a few hundred no-op vertices in the page for nothing. */
export function profilePath(plays: number[], max: number, v = 1000): string {
  const n = plays.length;
  const y = (p: number) => (v - (p / max) * v).toFixed(1);
  const x = (i: number) => ((i / n) * v).toFixed(1);
  let d = `M0 ${v}`;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j + 1 < n && plays[j + 1] === plays[i]) j++;
    d += ` L${x(i)} ${y(plays[i])} L${x(j + 1)} ${y(plays[i])}`;
    i = j + 1;
  }
  return `${d} L${v} ${v} Z`;
}

/** Gridlines every `step` plays — the coarsest round step that still fits at
 * least a couple of lines under the tallest song, so the head is read against
 * a scale rather than floating. */
export function playsStep(max: number): number {
  const steps = [5, 10, 20, 25, 50, 100, 200, 500, 1000];
  return steps.find((s) => max / s <= 4) ?? steps[steps.length - 1];
}

/** Rank labels: 1, every hundredth, and the last — skipping a hundredth that
 * would print on top of the last one. */
export function rankMajors(n: number): number[] {
  const out = [1];
  for (let r = 100; r < n; r += 100) if ((n - r) / n > 0.06) out.push(r);
  if (n > 1) out.push(n);
  return out;
}

export function CatalogProfile({ plays, topN }: { plays: number[]; topN: number }) {
  const n = plays.length;
  if (n === 0) return null;
  const max = Math.max(1, plays[0]);
  const k = halfPoint(plays);
  const tail = tailStart(plays, RARITY_MAX_PLAYS);
  const tailCount = n - tail;
  const head = Math.min(topN, n);
  const pct = (i: number) => (i / n) * 100;
  const step = playsStep(max);
  const gridlines: number[] = [];
  for (let v = step; v < max; v += step) gridlines.push(v);
  const majors = rankMajors(n);

  return (
    <figure
      className="m-0"
      aria-label={`Every played song ranked by plays: ${n} songs, from ${max} plays down to ${plays[n - 1]}. The top ${k} account for half of all plays.`}
    >
      <div className="relative h-36 sm:h-44">
        <svg
          viewBox="0 0 1000 1000"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          {gridlines.map((v) => (
            <line
              key={v}
              x1={0}
              x2={1000}
              y1={1000 - (v / max) * 1000}
              y2={1000 - (v / max) * 1000}
              stroke="var(--line-soft)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {/* The catalog. */}
          <path d={profilePath(plays, max)} fill="var(--steel)" fillOpacity={0.8} />
          {/* Baseline. */}
          <line x1={0} y1={1000} x2={1000} y2={1000} stroke="var(--ink)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          {/* The reading. */}
          <line
            x1={(k / n) * 1000}
            x2={(k / n) * 1000}
            y1={0}
            y2={1000}
            stroke="var(--hand)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {gridlines.map((v) => (
          <span
            key={v}
            className="absolute right-0 -translate-y-full pb-0.5 font-mono text-[0.6rem] leading-none text-faint"
            style={{ top: `${100 - (v / max) * 100}%` }}
          >
            {v}
          </span>
        ))}

        <span
          aria-hidden="true"
          className="absolute top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-hand"
          style={{ left: `${pct(k)}%` }}
        />
        <span
          className="absolute top-0 ml-2 whitespace-nowrap text-[0.78rem] leading-none text-ink"
          style={{ left: `${pct(k)}%` }}
        >
          <b className="font-mono font-semibold">{k}</b> songs are half of all plays
        </span>
      </div>

      {/* Rank ruler: ten even minors, labeled majors. */}
      <div className="relative h-6" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => (
          <span key={`m${i}`} className="absolute top-0 h-1 w-px bg-faint" style={{ left: `${i * 10}%` }} />
        ))}
        {majors.map((r) => (
          <span key={`t${r}`} className="absolute top-0 h-2 w-px bg-faint" style={{ left: `${pct(r - 1)}%` }} />
        ))}
        {majors.map((r) => (
          <span
            key={`l${r}`}
            className={`absolute top-2.5 font-mono text-[0.6rem] leading-none text-faint ${
              r === 1 ? "" : r === n ? "-translate-x-full" : "-translate-x-1/2"
            }`}
            style={{ left: r === n ? "100%" : `${pct(r - 1)}%` }}
          >
            {r}
          </span>
        ))}
      </div>

      {/* The cuts, bracketed onto the shape. */}
      <div className="relative h-9">
        <Bracket from={0} to={pct(head)} href="/stats/most-played" align="left">
          most played · top {head}
        </Bracket>
        {tailCount > 0 && (
          <Bracket from={pct(tail)} to={100} href="/stats/rarities" align="right">
            {RARITY_MAX_PLAYS} plays or fewer · {compact(tailCount)} songs
          </Bracket>
        )}
      </div>

      <figcaption>
        <PenNote>
          {compact(n)} played songs, ranked by plays. The head is what Most Played lists; Rarities lives on the
          flat tail, less the one-off covers.
        </PenNote>
      </figcaption>
    </figure>
  );
}

function Bracket({
  from,
  to,
  href,
  align,
  children,
}: {
  from: number;
  to: number;
  href: string;
  align: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <span className="absolute top-0 flex flex-col" style={{ left: `${from}%`, width: `${to - from}%` }}>
      <span aria-hidden="true" className="block h-1.5 border-x border-t border-pencil" />
      <Link
        href={href}
        className={`mt-1.5 whitespace-nowrap font-mono text-[0.62rem] leading-none ${chromeLink} ${
          align === "right" ? "self-end" : "self-start"
        }`}
      >
        {children}
      </Link>
    </span>
  );
}

import Link from "next/link";
import type { TransitionRow } from "@/lib/queries/discoveries";

/** Segues, set in the notation the scene already reads.
 *
 * A setlist is a sequence, and its grammar — `A > B` — is a language fans are
 * fluent in. Rendering it as a ranked bar chart throws that away and answers a
 * sequence question with a magnitude picture. So: the pair is the row, the
 * segue is the mark, and frequency thickens the splice between the two songs
 * instead of drawing a bar somewhere off to the side. */
const SPLICE = { w: 64, h: 14, min: 1, max: 5 } as const;

/** The join, weighted by how often the band actually plays it. */
function Splice({ weight }: { weight: number }) {
  const stroke = SPLICE.min + weight * (SPLICE.max - SPLICE.min);
  const mid = SPLICE.h / 2;
  return (
    <svg
      viewBox={`0 0 ${SPLICE.w} ${SPLICE.h}`}
      width={SPLICE.w}
      height={SPLICE.h}
      className="shrink-0"
      aria-hidden="true"
    >
      <line
        x1={2}
        y1={mid}
        x2={SPLICE.w - 10}
        y2={mid}
        stroke="var(--gold)"
        strokeWidth={stroke}
        strokeLinecap="butt"
        opacity={0.45 + weight * 0.55}
      />
      <path
        d={`M${SPLICE.w - 11} ${mid - 4.5} L${SPLICE.w - 2} ${mid} L${SPLICE.w - 11} ${mid + 4.5} Z`}
        fill="var(--gold)"
        opacity={0.45 + weight * 0.55}
      />
    </svg>
  );
}

export function TransitionsList({ data }: { data: TransitionRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No transitions found yet.</p>;
  }
  const most = Math.max(...data.map((d) => d.count));
  const fewest = Math.min(...data.map((d) => d.count));
  const spread = most - fewest;

  return (
    <>
      <ol>
        {data.map((t) => {
          const weight = spread === 0 ? 1 : (t.count - fewest) / spread;
          return (
            <li
              key={`${t.sourceSlug ?? t.sourceName}|${t.targetSlug ?? t.targetName}`}
              className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-line-soft py-2.5 sm:flex-nowrap sm:justify-start"
            >
              <span className="min-w-0 flex-1 truncate text-right font-mono text-sm">
                <SongTag name={t.sourceName} slug={t.sourceSlug} />
              </span>
              <Splice weight={weight} />
              <span className="min-w-0 flex-1 truncate font-mono text-sm">
                <SongTag name={t.targetName} slug={t.targetSlug} />
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-faint sm:w-14 sm:text-right">
                {t.count}
                <span className="ml-0.5">×</span>
              </span>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 font-mono text-[0.62rem] text-faint">
        Read as a setlist: the splice thickens with how often the band actually plays the segue.
      </p>
    </>
  );
}

function SongTag({ name, slug }: { name: string; slug: string | null }) {
  const cls = "text-ink hover:text-gold";
  return slug ? (
    <Link href={`/songs/${slug}`} className={cls}>
      {name}
    </Link>
  ) : (
    <span className={cls}>{name}</span>
  );
}

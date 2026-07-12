import Link from "next/link";
import { formatShortDate } from "@/lib/queries/format";
import type { ShelfRow } from "@/lib/queries/discoveries";

/** Past a year on the shelf, the tape is drawn in the red — the same
 * "overdue" reading `--ember` carries everywhere else on the site. */
const RED_ZONE_DAYS = 365;

/** Geometry of one hub, in the SVG's own 100×100 units. */
const HUB = { c: 50, hole: 5, core: 16, rim: 42 } as const;
/** Never wind the tape flush to the rim or flush to the core: a spool that
 * reads as "empty" or "full" would imply a bound the data doesn't have. */
const TAPE = { min: 0.1, span: 0.85 } as const;

/** Six-pronged drive hub, the shape a cassette actually has. */
function Prongs() {
  return (
    <g stroke="var(--line)" strokeWidth={2.5} strokeLinecap="round">
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line
            key={deg}
            x1={HUB.c + Math.cos(rad) * 8}
            y1={HUB.c + Math.sin(rad) * 8}
            x2={HUB.c + Math.cos(rad) * 13}
            y2={HUB.c + Math.sin(rad) * 13}
          />
        );
      })}
    </g>
  );
}

/** A song's gap, drawn as the thing it describes: tape left on the spool.
 * `wound` is 0 (barest — longest shelved) to 1 (fullest — played most recently). */
function Spool({ wound, red }: { wound: number; red: boolean }) {
  const thickness = (TAPE.min + wound * TAPE.span) * (HUB.rim - HUB.core);
  const mid = HUB.core + thickness / 2;
  const tape = red ? "var(--ember)" : "var(--gold)";
  return (
    <svg viewBox="0 0 100 100" className="w-full" aria-hidden="true">
      {/* The tape window: how much spool there is to fill. */}
      <circle cx={HUB.c} cy={HUB.c} r={HUB.rim} fill="none" stroke="var(--line-soft)" strokeWidth={1} />
      {/* The wound pack. */}
      <circle cx={HUB.c} cy={HUB.c} r={mid} fill="none" stroke={tape} strokeWidth={thickness} opacity={0.9} />
      {/* Two layer lines, so the pack reads as wound tape rather than a ring. */}
      <circle
        cx={HUB.c}
        cy={HUB.c}
        r={HUB.core + thickness * 0.35}
        fill="none"
        stroke="var(--bg)"
        strokeWidth={0.6}
        opacity={0.35}
      />
      <circle
        cx={HUB.c}
        cy={HUB.c}
        r={HUB.core + thickness * 0.7}
        fill="none"
        stroke="var(--bg)"
        strokeWidth={0.6}
        opacity={0.35}
      />
      {/* The hub. */}
      <circle cx={HUB.c} cy={HUB.c} r={HUB.core} fill="var(--surface)" stroke="var(--line)" strokeWidth={1} />
      <Prongs />
      <circle cx={HUB.c} cy={HUB.c} r={HUB.hole} fill="var(--bg)" stroke="var(--line)" strokeWidth={1} />
    </svg>
  );
}

/** Originals with the longest current gap. Sorted oldest-first, so `data[0]`
 * is the barest spool and the last row is the fullest. */
export function TheShelf({ data }: { data: ShelfRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No originals qualify yet.</p>;
  }

  // Log-scaled, and normalised across the set rather than against zero. Gaps
  // are heavily skewed (88–1367 days as of writing) and read multiplicatively —
  // three years shelved versus four is barely a distinction, where one month
  // versus three is a large one. On a linear scale the long tail flattens
  // everything below it into identical spools; on a log scale the mid-range
  // separates and genuinely-equal gaps still look equal.
  const scale = (days: number) => Math.log(Math.max(1, days));
  const gaps = data.map((s) => scale(s.daysSincePlayed));
  const longest = Math.max(...gaps);
  const shortest = Math.min(...gaps);
  const spread = longest - shortest;

  return (
    <>
      <ol className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {data.map((song, i) => {
          const wound = spread === 0 ? 0.5 : (longest - scale(song.daysSincePlayed)) / spread;
          const red = song.daysSincePlayed >= RED_ZONE_DAYS;
          return (
            <li key={song.songId} className="flex flex-col items-center text-center">
              <div className="relative w-full max-w-[124px]">
                <Spool wound={wound} red={red} />
                <span className="absolute left-0 top-0 font-mono text-[0.6rem] tabular-nums text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-2 w-full">
                {song.slug ? (
                  <Link
                    href={`/songs/${song.slug}`}
                    className="block truncate font-display text-[0.9rem] text-ink hover:text-gold"
                  >
                    {song.name}
                  </Link>
                ) : (
                  <span className="block truncate font-display text-[0.9rem] text-ink">{song.name}</span>
                )}
                <p className="mt-0.5 font-mono text-sm tabular-nums">
                  <span className={red ? "text-ember" : "text-gold"}>{song.daysSincePlayed}</span>
                  <span className="ml-1 text-xs text-faint">days</span>
                </p>
                <p className="mt-0.5 font-mono text-[0.62rem] leading-relaxed text-faint">
                  {formatShortDate(song.lastPlayedDate)} · {song.totalPlays} plays
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 font-mono text-[0.62rem] text-faint">
        Tape left on the spool is time <em className="not-italic text-muted">since</em> the last play — the barest
        spool has been shelved longest. Past a year, the pack runs into the red.
      </p>
    </>
  );
}

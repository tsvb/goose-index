import Link from "next/link";
import { formatShortDate } from "@/lib/queries/format";
import type { ShelfRow } from "@/lib/queries/discoveries";

/** Past a year on the shelf, the tape is drawn in the red — the same
 * "overdue" reading `--ember` carries everywhere else on the site. */
const RED_ZONE_DAYS = 365;

/** Geometry of one hub, in the SVG's own 100×100 units. */
const HUB = { c: 50, hole: 5, core: 16, rim: 42, ring: 46 } as const;
/** Never wind the tape flush to the rim or flush to the core: a spool that
 * reads as "empty" or "full" would imply a bound the data doesn't have. */
const TAPE = { min: 0.1, span: 0.85 } as const;
/** The shortest gap still gets a visible stub of ring, or it reads as broken. */
const MIN_SWEEP = 0.06;

export type SpoolReading = {
  /** Tape left on the hub: 0 = barest (shelved longest), 1 = fullest. */
  wound: number;
  /** How far the countdown ring has travelled: 0 = just played, 1 = shelved longest. */
  gap: number;
  red: boolean;
};

/** The two readings a spool carries, as pure numbers.
 *
 * Log-scaled and normalised across the set rather than against zero. Gaps are
 * heavily skewed (88–1367 days as of writing) and read multiplicatively — three
 * years shelved versus four is barely a distinction, where one month versus
 * three is a large one. On a linear scale the long tail flattens everything
 * below it into identical spools.
 *
 * `wound` and `gap` are deliberately complementary. The spool alone had its
 * salience backwards: ink reads as importance, so the longest-shelved song —
 * the entire point of the section — was drawn as a hairline while a
 * merely-dusty one was a fat bright donut. The ring fixes that without
 * compromising the metaphor: as the tape runs out, the ring fills up, so the
 * song that most deserves attention is also the one carrying the most ink. */
export function spoolReadings(data: ShelfRow[]): SpoolReading[] {
  const scale = (days: number) => Math.log(Math.max(1, days));
  const scaled = data.map((s) => scale(s.daysSincePlayed));
  const longest = Math.max(...scaled);
  const shortest = Math.min(...scaled);
  const spread = longest - shortest;

  return data.map((song, i) => {
    const wound = spread === 0 ? 0.5 : (longest - scaled[i]) / spread;
    const gap = Math.max(MIN_SWEEP, 1 - wound);
    return { wound, gap, red: song.daysSincePlayed >= RED_ZONE_DAYS };
  });
}

/** Clockwise from twelve. SVG arcs can't close a full circle, so the ring stops
 * a hair short of one — which also leaves the origin tick visible. */
function ringPath(fraction: number, r: number) {
  const sweep = Math.min(fraction, 0.995) * 360;
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const a = { x: HUB.c + Math.cos(rad(0)) * r, y: HUB.c + Math.sin(rad(0)) * r };
  const b = { x: HUB.c + Math.cos(rad(sweep)) * r, y: HUB.c + Math.sin(rad(sweep)) * r };
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

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

/** The tape is material, not signal.
 *
 * Drawing the pack in the accent colour made a full spool the loudest object on
 * the page — a fat bright donut has far more ink than a thin ring — so the
 * songs played three months ago shouted over the one shelved for four years.
 * Colour now carries exactly one meaning: how long it's been. The pack is
 * graphite (which is also what tape actually looks like; it was never cyan),
 * and every drop of accent is spent on the ring. */
function Spool({ wound, gap, red }: SpoolReading) {
  const thickness = Number(((TAPE.min + wound * TAPE.span) * (HUB.rim - HUB.core)).toFixed(2));
  const packOuter = HUB.core + thickness;
  const mid = HUB.core + thickness / 2;
  const signal = red ? "var(--ember)" : "var(--gold)";

  // Ghost windings: where tape would be if the song were still in rotation.
  const missing = HUB.rim - packOuter;
  const ghosts = missing > 3 ? [0.3, 0.6, 0.9].map((f) => packOuter + missing * f) : [];

  return (
    <svg viewBox="0 0 100 100" className="w-full" aria-hidden="true">
      {/* The countdown ring's track — so a short arc is read against a whole turn. */}
      <circle cx={HUB.c} cy={HUB.c} r={HUB.ring} fill="none" stroke="var(--line-soft)" strokeWidth={3} />
      {/* Origin tick at twelve. */}
      <line x1={HUB.c} y1={HUB.ring - 5} x2={HUB.c} y2={HUB.ring + 5} stroke="var(--line)" strokeWidth={1} />
      {/* Past a year, the ring burns. */}
      {red && (
        <path d={ringPath(gap, HUB.ring)} fill="none" stroke={signal} strokeWidth={7} opacity={0.18} strokeLinecap="butt" />
      )}
      {/* The gap itself, given a mark: the longer it's been, the further this travels. */}
      <path data-role="gap" d={ringPath(gap, HUB.ring)} fill="none" stroke={signal} strokeWidth={3} strokeLinecap="butt" />

      {/* The well: the spool cavity, so what's *gone* is visible as space. */}
      <circle cx={HUB.c} cy={HUB.c} r={HUB.rim} fill="var(--bg-deep)" stroke="var(--line-soft)" strokeWidth={1} />
      {/* The windings that have run off. */}
      {ghosts.map((r) => (
        <circle key={r} cx={HUB.c} cy={HUB.c} r={r} fill="none" stroke={signal} strokeWidth={0.5} strokeDasharray="1 5" opacity={0.3} />
      ))}
      {/* The wound pack — graphite. Thickness still carries the reading; colour does not. */}
      <circle data-role="pack" cx={HUB.c} cy={HUB.c} r={mid} fill="none" stroke="var(--line)" strokeWidth={thickness} />
      {thickness > 6 && (
        <>
          <circle cx={HUB.c} cy={HUB.c} r={HUB.core + thickness * 0.35} fill="none" stroke="var(--bg-deep)" strokeWidth={0.6} opacity={0.5} />
          <circle cx={HUB.c} cy={HUB.c} r={HUB.core + thickness * 0.7} fill="none" stroke="var(--bg-deep)" strokeWidth={0.6} opacity={0.5} />
        </>
      )}
      {/* The hub. */}
      <circle cx={HUB.c} cy={HUB.c} r={HUB.core} fill="var(--surface)" stroke="var(--line)" strokeWidth={1} />
      <Prongs />
      <circle cx={HUB.c} cy={HUB.c} r={HUB.hole} fill="var(--bg)" stroke="var(--line)" strokeWidth={1} />
    </svg>
  );
}

/** Originals with the longest current gap. Sorted oldest-first, so `data[0]`
 * is the barest spool and the fullest ring. */
export function TheShelf({ data }: { data: ShelfRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No originals qualify yet.</p>;
  }
  const readings = spoolReadings(data);

  return (
    <>
      <ol className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
        {data.map((song, i) => {
          const r = readings[i];
          return (
            <li key={song.songId} className="flex flex-col items-center text-center">
              <div className="relative w-full max-w-[124px]">
                <Spool {...r} />
                <span className="absolute left-0 top-0 font-mono text-[0.6rem] tabular-nums text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div className="mt-2 w-full">
                {song.slug ? (
                  <Link href={`/songs/${song.slug}`} className="block truncate font-display text-[0.9rem] text-ink hover:text-gold">
                    {song.name}
                  </Link>
                ) : (
                  <span className="block truncate font-display text-[0.9rem] text-ink">{song.name}</span>
                )}
                <p className="mt-0.5 font-mono text-sm tabular-nums">
                  <span className={r.red ? "text-ember" : "text-gold"}>{song.daysSincePlayed}</span>
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
        Two readings, one spool: the tape left on the hub is what remains, and the ring around it is how far the gap has
        travelled. As a song runs out of tape, its ring closes. Past a year, both run into the red.
      </p>
    </>
  );
}

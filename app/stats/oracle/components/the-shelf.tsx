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
const TAPE = { min: 0.14, span: 0.8 } as const;
/** The shortest gap still gets a visible stub of ring, or it reads as broken. */
const MIN_SWEEP = 0.06;

export type SpoolReading = {
  /** How much tape this song has ever had: 0 = a rarity, 1 = a staple. */
  wound: number;
  /** How far the countdown ring has travelled: 0 = just played, 1 = shelved longest. */
  gap: number;
  red: boolean;
};

/** The two readings a spool carries, as pure numbers.
 *
 * They must encode *different* facts, or the second channel is decoration. An
 * earlier pass drew tape as `1 - gap`, which is the same number twice: it told
 * you nothing the ring hadn't already said.
 *
 *   ring  = time since the last play — the question the section asks
 *   tape  = total plays — how big a song this is
 *
 * That pairing is what makes the picture worth looking at. A fat spool inside a
 * complete ring is a *staple that has vanished*, which is genuinely alarming; a
 * thin spool inside a complete ring is a rarity behaving like a rarity. Drawn
 * as one number those two cases are indistinguishable, and the interesting one
 * disappears.
 *
 * Both are log-scaled and normalised across the set. Gaps (88–1367 days) and
 * play counts (6–110) are heavily skewed and read multiplicatively: three years
 * shelved versus four is barely a distinction where one month versus three is a
 * large one, and 100 plays versus 110 is nothing where 6 versus 20 is
 * everything. On a linear scale the long tail flattens everything beneath it. */
export function spoolReadings(data: ShelfRow[]): SpoolReading[] {
  const log = (n: number) => Math.log(Math.max(1, n));

  const gaps = data.map((s) => log(s.daysSincePlayed));
  const gapMax = Math.max(...gaps);
  const gapMin = Math.min(...gaps);
  const gapSpread = gapMax - gapMin;

  const plays = data.map((s) => log(s.totalPlays));
  const playMax = Math.max(...plays);
  const playMin = Math.min(...plays);
  const playSpread = playMax - playMin;

  return data.map((song, i) => ({
    wound: playSpread === 0 ? 0.5 : (plays[i] - playMin) / playSpread,
    gap: gapSpread === 0 ? 1 : Math.max(MIN_SWEEP, (gaps[i] - gapMin) / gapSpread),
    red: song.daysSincePlayed >= RED_ZONE_DAYS,
  }));
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
 * and every drop of accent is spent on the ring, whose sweep is the gap. */
function Spool({ wound, gap, red }: SpoolReading) {
  const thickness = Number(((TAPE.min + wound * TAPE.span) * (HUB.rim - HUB.core)).toFixed(2));
  const packOuter = HUB.core + thickness;
  const mid = HUB.core + thickness / 2;
  const signal = red ? "var(--ember)" : "var(--gold)";

  return (
    <svg viewBox="0 0 100 100" className="w-full" aria-hidden="true">
      {/* The countdown ring's track. It has to be *visible*: a recently-played
          song is a short stub of arc, and without a full turn behind it the
          stub reads as a stray tick rather than "barely begun". */}
      <circle cx={HUB.c} cy={HUB.c} r={HUB.ring} fill="none" stroke="var(--line)" strokeWidth={3} />
      {/* Origin tick at twelve. */}
      <line x1={HUB.c} y1={HUB.ring - 5} x2={HUB.c} y2={HUB.ring + 5} stroke="var(--line)" strokeWidth={1} />
      {/* Past a year, the ring burns. */}
      {red && (
        <path d={ringPath(gap, HUB.ring)} fill="none" stroke={signal} strokeWidth={7} opacity={0.18} strokeLinecap="butt" />
      )}
      {/* The gap itself, given a mark: the longer it's been, the further this travels. */}
      <path data-role="gap" d={ringPath(gap, HUB.ring)} fill="none" stroke={signal} strokeWidth={3} strokeLinecap="butt" />

      {/* The shell window: the cavity the tape is wound in. */}
      <circle cx={HUB.c} cy={HUB.c} r={HUB.rim} fill="var(--bg-deep)" stroke="var(--line-soft)" strokeWidth={1} />
      {/* The wound pack — graphite. Thickness is the song's size; colour says nothing. */}
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
      <p className="mt-5 max-w-2xl font-mono text-[0.62rem] leading-relaxed text-faint">
        Two readings per spool: the <span className="text-muted">tape</span> on the hub is how big a song is (total
        plays), and the <span className="text-gold">ring</span> around it is how long since it was last played, closing
        as the gap grows. Past a year the ring runs into the <span className="text-ember">red</span>. A thick spool
        inside a closed ring is the one to worry about — a staple the band has stopped playing.
      </p>
    </>
  );
}

import Link from "next/link";
import type { DeepestVenueRow } from "@/lib/queries/discoveries";

/** Jam share is a level, so it gets a meter.
 *
 * "How hard does this room push?" is an intensity question, and intensity has a
 * native instrument: a needle, a scale, and a red zone at the top. The counts
 * stay in text underneath because deflection alone can't tell you whether a
 * room is deep or merely small — three shows can fake a hot average. */
const VU = { c: 60, pivot: 52, sweep: 50, dial: 40, tickIn: 33 } as const;
/** The top quarter of the scale is the red zone — exceptional, not merely good. */
const RED_FROM = 0.75;

/** Needle angle: -sweep at empty, +sweep at full scale. */
function angleFor(fraction: number) {
  return (-VU.sweep + fraction * VU.sweep * 2) * (Math.PI / 180);
}
function arcPoint(fraction: number, radius: number) {
  const a = angleFor(fraction) - Math.PI / 2;
  return { x: VU.c + Math.cos(a) * radius, y: VU.pivot + Math.sin(a) * radius };
}
function arcPath(from: number, to: number, radius: number) {
  const a = arcPoint(from, radius);
  const b = arcPoint(to, radius);
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function Meter({ fraction }: { fraction: number }) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const needle = arcPoint(clamped, VU.dial - 2);
  const inRed = clamped >= RED_FROM;
  return (
    <svg viewBox="0 0 120 70" className="w-full" aria-hidden="true">
      {/* Scale: nominal, then the red zone. */}
      <path d={arcPath(0, RED_FROM, VU.dial)} fill="none" stroke="var(--line)" strokeWidth={2} />
      <path d={arcPath(RED_FROM, 1, VU.dial)} fill="none" stroke="var(--ember)" strokeWidth={2} opacity={0.75} />
      {/* Graduations. */}
      <g stroke="var(--line)" strokeWidth={1}>
        {Array.from({ length: 11 }, (_, i) => {
          const f = i / 10;
          const outer = arcPoint(f, VU.dial - 2);
          const inner = arcPoint(f, i % 5 === 0 ? VU.tickIn : VU.tickIn + 4);
          return (
            <line
              key={i}
              x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              opacity={f >= RED_FROM ? 0.9 : 0.55}
              stroke={f >= RED_FROM ? "var(--ember)" : "var(--line)"}
            />
          );
        })}
      </g>
      {/* The needle. */}
      <line
        x1={VU.c} y1={VU.pivot} x2={needle.x} y2={needle.y}
        stroke={inRed ? "var(--ember)" : "var(--gold)"}
        strokeWidth={1.6}
        strokeLinecap="round"
      />
      <circle cx={VU.c} cy={VU.pivot} r={3} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={1} />
    </svg>
  );
}

export function VenueDepth({ data }: { data: DeepestVenueRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No venues qualify yet.</p>;
  }

  // Full scale is a round number just above the hottest room, so every needle
  // is read against the same dial rather than each being self-normalised.
  const hottest = Math.max(...data.map((d) => d.jamPercentage));
  const fullScale = Math.max(10, Math.ceil(hottest / 10) * 10);

  return (
    <>
      <ol className="grid grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
        {data.map((v) => {
          const fraction = v.jamPercentage / fullScale;
          const inRed = fraction >= RED_FROM;
          return (
            <li key={v.venueId} className="min-w-0 border-b border-line-soft pb-3">
              <Meter fraction={fraction} />
              <p className="-mt-1 text-center font-mono text-sm tabular-nums">
                <span className={inRed ? "text-ember" : "text-gold"}>{v.jamPercentage.toFixed(1)}</span>
                <span className="ml-0.5 text-xs text-faint">%</span>
              </p>
              <p className="mt-1 truncate text-center font-display text-[0.82rem] text-ink">
                {v.slug ? (
                  <Link href={`/venues/${v.slug}`} className="hover:text-gold">
                    {v.name}
                  </Link>
                ) : (
                  v.name
                )}
              </p>
              <p className="mt-0.5 text-center font-mono text-[0.6rem] leading-relaxed text-faint">
                {v.totalJams}/{v.totalPerformances} jams · {v.totalShows} shows
              </p>
            </li>
          );
        })}
      </ol>
      <p className="mt-4 font-mono text-[0.62rem] text-faint">
        One dial for every room: full scale {fullScale}% jam-tagged, red past {Math.round(fullScale * RED_FROM)}%. The
        counts underneath keep a hot three-show room honest.
      </p>
    </>
  );
}

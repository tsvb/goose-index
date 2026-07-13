import Link from "next/link";
import type { DeepestVenueRow } from "@/lib/queries/discoveries";

/** Jam share is a level, so it gets a meter.
 *
 * The first pass drew a thin arc and a needle and read as a swoosh, not an
 * instrument — a gauge needs three things before the eye accepts it as one: a
 * sweep wide enough to travel, a scale you can actually see, and a housing to
 * sit in. So: a 130° sweep, graduated ticks with endpoint labels, and a bezel.
 *
 * The counts stay in text underneath because deflection alone can't say whether
 * a room is deep or merely small — three hot shows can fake an average. */
const VU = { w: 150, h: 96, cx: 75, pivot: 82, dial: 60, sweep: 65 } as const;
/** The top quarter of the scale is the red zone — exceptional, not merely good. */
const RED_FROM = 0.75;

function angleFor(fraction: number) {
  return (-VU.sweep + fraction * VU.sweep * 2 - 90) * (Math.PI / 180);
}
function polar(fraction: number, radius: number) {
  const a = angleFor(fraction);
  return { x: VU.cx + Math.cos(a) * radius, y: VU.pivot + Math.sin(a) * radius };
}
function arc(from: number, to: number, radius: number) {
  const a = polar(from, radius);
  const b = polar(to, radius);
  return `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function Meter({ fraction, fullScale }: { fraction: number; fullScale: number }) {
  const clamped = Math.min(1, Math.max(0, fraction));
  const inRed = clamped >= RED_FROM;
  // The needle must reach the graduations it is pointing at — stopping short
  // leaves it floating in the middle of the housing, reading as a stray line.
  const tip = polar(clamped, VU.dial - 3);
  const tail = polar(clamped, -6);

  return (
    <svg viewBox={`0 0 ${VU.w} ${VU.h}`} className="w-full" aria-hidden="true">
      {/* Housing. */}
      <rect x={1} y={1} width={VU.w - 2} height={VU.h - 2} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={1} />

      {/* The scale: nominal, then the red zone. */}
      <path d={arc(0, RED_FROM, VU.dial)} fill="none" stroke="var(--muted)" strokeWidth={1.5} />
      <path d={arc(RED_FROM, 1, VU.dial)} fill="none" stroke="var(--ember)" strokeWidth={2.5} />

      {/* Graduations. */}
      {Array.from({ length: 21 }, (_, i) => {
        const f = i / 20;
        const major = i % 5 === 0;
        const red = f >= RED_FROM;
        const outer = polar(f, VU.dial - 1.5);
        const inner = polar(f, VU.dial - (major ? 9 : 5));
        return (
          <line
            key={i}
            x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
            stroke={red ? "var(--ember)" : "var(--muted)"}
            strokeWidth={major ? 1.3 : 0.7}
            opacity={major ? 0.95 : 0.5}
          />
        );
      })}

      {/* Endpoints, so the needle is read against a known range. */}
      <text x={polar(0, VU.dial - 17).x} y={polar(0, VU.dial - 17).y} textAnchor="middle" dominantBaseline="central"
        className="font-mono" fontSize={7} fill="var(--faint)">0</text>
      <text x={polar(1, VU.dial - 17).x} y={polar(1, VU.dial - 17).y} textAnchor="middle" dominantBaseline="central"
        className="font-mono" fontSize={7} fill="var(--ember)">{fullScale}</text>

      {/* The needle, with its counterweight past the pivot. */}
      <line
        x1={tail.x} y1={tail.y} x2={tip.x} y2={tip.y}
        stroke={inRed ? "var(--ember)" : "var(--gold)"} strokeWidth={1.8} strokeLinecap="round"
      />
      <circle cx={VU.cx} cy={VU.pivot} r={4.5} fill="var(--surface)" stroke="var(--line)" strokeWidth={1} />
      <circle cx={VU.cx} cy={VU.pivot} r={1.4} fill={inRed ? "var(--ember)" : "var(--gold)"} />
    </svg>
  );
}

export function VenueDepth({ data }: { data: DeepestVenueRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No venues qualify yet.</p>;
  }

  // Full scale is a round number just above the hottest room, so every needle is
  // read against the same dial rather than each being self-normalised.
  const hottest = Math.max(...data.map((d) => d.jamPercentage));
  const fullScale = Math.max(10, Math.ceil(hottest / 10) * 10);

  return (
    <>
      <ol className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {data.map((v) => {
          const fraction = v.jamPercentage / fullScale;
          const inRed = fraction >= RED_FROM;
          return (
            <li key={v.venueId} className="min-w-0">
              <Meter fraction={fraction} fullScale={fullScale} />
              <p className="mt-1.5 text-center font-mono text-sm tabular-nums">
                <span className={inRed ? "text-ember" : "text-gold"}>{v.jamPercentage.toFixed(1)}</span>
                <span className="ml-0.5 text-xs text-faint">%</span>
              </p>
              <p className="mt-0.5 truncate text-center font-display text-[0.82rem] text-ink">
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

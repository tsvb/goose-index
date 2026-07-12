import { WEEKDAYS } from "@/lib/queries/format";
import type { DayOfWeekJamsRow } from "@/lib/queries/discoveries";

/** A week is a cycle, so it gets a dial rather than a row of bars.
 *
 * Raw averages by weekday are nearly flat — the band really does jam about as
 * much on a Tuesday as a Saturday — and a from-zero bar chart spends all its
 * ink on the part they share, leaving the differences invisible. So the spokes
 * carry the *deviation from the week's own mean*: outward is a jammier night
 * than usual, inward a leaner one. Same numbers, told against the baseline that
 * makes them mean something. */
const FACE = { c: 100, baseline: 58, reach: 22, label: 84 } as const;

/** Sunday (0) last, so the dial reads Mon → Sun like a calendar week. */
const ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function orderMonSun(data: DayOfWeekJamsRow[]): DayOfWeekJamsRow[] {
  const by = new Map(data.map((d) => [d.dow, d]));
  return ORDER.map((dow) => by.get(dow) ?? { dow, dayName: WEEKDAYS[dow], totalShows: 0, avgJams: 0 });
}

/** Position on the face, starting at 12 o'clock and running clockwise. */
function point(i: number, radius: number) {
  const angle = (-90 + i * (360 / 7)) * (Math.PI / 180);
  return { x: FACE.c + Math.cos(angle) * radius, y: FACE.c + Math.sin(angle) * radius };
}

export function DayOfWeekDial({ data }: { data: DayOfWeekJamsRow[] }) {
  const days = orderMonSun(data);
  const played = days.filter((d) => d.totalShows > 0);
  if (played.length === 0) {
    return <p className="font-mono text-sm text-faint">No shows to read yet.</p>;
  }

  // Mean over the days actually played, so a weekday the band has never
  // played can't drag the baseline down.
  const mean = played.reduce((sum, d) => sum + d.avgJams, 0) / played.length;
  const widest = Math.max(...played.map((d) => Math.abs(d.avgJams - mean)), 0.0001);
  const hottest = played.reduce((a, b) => (b.avgJams > a.avgJams ? b : a), played[0]);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
      <svg viewBox="0 0 200 200" className="w-full max-w-[280px] shrink-0" role="img"
        aria-label={`Average jams per show by day of the week, as deviation from the weekly mean of ${mean.toFixed(2)}`}>
        {/* Braun minute ticks — the bezel of a clock face. */}
        <g stroke="var(--line)" strokeWidth={1}>
          {Array.from({ length: 56 }, (_, t) => {
            const a = (t * (360 / 56) - 90) * (Math.PI / 180);
            const inner = t % 8 === 0 ? 88 : 92;
            return (
              <line
                key={t}
                x1={FACE.c + Math.cos(a) * inner}
                y1={FACE.c + Math.sin(a) * inner}
                x2={FACE.c + Math.cos(a) * 95}
                y2={FACE.c + Math.sin(a) * 95}
                opacity={t % 8 === 0 ? 1 : 0.45}
              />
            );
          })}
        </g>

        {/* The baseline: the week's own average. Every spoke is read against it. */}
        <circle cx={FACE.c} cy={FACE.c} r={FACE.baseline} fill="none" stroke="var(--line)" strokeWidth={1} />

        {days.map((d, i) => {
          if (d.totalShows === 0) return null;
          const dev = (d.avgJams - mean) / widest;
          const tip = FACE.baseline + dev * FACE.reach;
          const from = point(i, FACE.baseline);
          const to = point(i, tip);
          const hot = d.dow === hottest.dow;
          const above = d.avgJams >= mean;
          return (
            <g key={d.dow}>
              <line
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={hot ? "var(--ember)" : above ? "var(--gold)" : "var(--faint)"}
                strokeWidth={5}
                strokeLinecap="butt"
              />
              <circle
                cx={to.x} cy={to.y} r={3}
                fill={hot ? "var(--ember)" : above ? "var(--gold)" : "var(--faint)"}
              />
            </g>
          );
        })}

        {/* Day marks, set outside the face like numerals. */}
        {days.map((d, i) => {
          const p = point(i, FACE.label);
          const hot = d.totalShows > 0 && d.dow === hottest.dow;
          return (
            <text
              key={d.dow}
              x={p.x} y={p.y}
              textAnchor="middle" dominantBaseline="central"
              className="font-mono"
              fontSize={9}
              letterSpacing={1}
              fill={hot ? "var(--ember)" : "var(--muted)"}
            >
              {d.dayName.slice(0, 3).toUpperCase()}
            </text>
          );
        })}

        {/* The reading at the centre of the instrument. */}
        <text x={FACE.c} y={FACE.c - 6} textAnchor="middle" className="font-mono" fontSize={16}
          fill="var(--ink)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {mean.toFixed(2)}
        </text>
        <text x={FACE.c} y={FACE.c + 9} textAnchor="middle" className="font-mono" fontSize={7}
          letterSpacing={1.4} fill="var(--faint)">
          WEEK MEAN
        </text>
      </svg>

      <div className="w-full min-w-0">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-1">
          {days.map((d) => {
            const delta = d.avgJams - mean;
            const hot = d.totalShows > 0 && d.dow === hottest.dow;
            return (
              <li
                key={d.dow}
                className="flex items-baseline justify-between gap-3 border-b border-line-soft py-1 font-mono text-xs"
              >
                <span className={hot ? "text-ember" : "text-muted"}>{d.dayName.slice(0, 3)}</span>
                <span className="flex items-baseline gap-2 tabular-nums">
                  <span className={hot ? "text-ember" : "text-ink"}>{d.avgJams.toFixed(2)}</span>
                  <span className={`w-12 text-right ${delta >= 0 ? "text-gold" : "text-faint"}`}>
                    {d.totalShows === 0 ? "—" : `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)}`}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 font-mono text-[0.62rem] leading-relaxed text-faint">
          Spokes read against the week&apos;s mean, not zero — outward is a jammier night than usual, inward a leaner
          one. The spread is genuinely small; this is what it looks like honestly.
        </p>
      </div>
    </div>
  );
}

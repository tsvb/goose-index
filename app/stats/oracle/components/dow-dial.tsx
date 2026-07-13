import { WEEKDAYS } from "@/lib/queries/format";
import type { DayOfWeekJamsRow } from "@/lib/queries/discoveries";

/** A week is a cycle, so it gets a dial rather than a row of bars.
 *
 * Raw averages by weekday are nearly flat — the band jams about as much on a
 * Tuesday as a Saturday — and a from-zero bar chart spends all its ink on the
 * part they share, hiding the differences entirely. The spokes therefore carry
 * *deviation from the week's own mean*: outward is a jammier night than usual,
 * inward a leaner one.
 *
 * The tips are joined into a closed rose, because a single spoke among six
 * stubs reads as noise, while a shape reads as a week — you can see at a glance
 * that the front half of the week bulges and the back half caves in. */
const FACE = { c: 110, baseline: 56, reach: 18, label: 92, tickIn: 66, tickOut: 72 } as const;

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

  // Mean over the days actually played, so a weekday the band has never played
  // can't drag the baseline down.
  const mean = played.reduce((sum, d) => sum + d.avgJams, 0) / played.length;
  const widest = Math.max(...played.map((d) => Math.abs(d.avgJams - mean)), 0.0001);
  const hottest = played.reduce((a, b) => (b.avgJams > a.avgJams ? b : a), played[0]);

  const radiusFor = (d: DayOfWeekJamsRow) =>
    d.totalShows === 0 ? FACE.baseline : FACE.baseline + ((d.avgJams - mean) / widest) * FACE.reach;

  const rose = days.map((d, i) => {
    const p = point(i, radiusFor(d));
    return `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }).join(" ") + " Z";

  return (
    <div className="flex flex-col items-center gap-4">
      <svg
        viewBox="0 0 220 220"
        className="w-full max-w-[380px]"
        role="img"
        aria-label={`Jams per show by weekday, as deviation from the weekly mean of ${mean.toFixed(2)}. ${days
          .filter((d) => d.totalShows > 0)
          .map((d) => `${d.dayName} ${d.avgJams.toFixed(2)}`)
          .join(", ")}.`}
      >
        {/* Braun bezel. */}
        <g stroke="var(--line)" strokeWidth={1}>
          {Array.from({ length: 56 }, (_, t) => {
            const a = (t * (360 / 56) - 90) * (Math.PI / 180);
            const major = t % 8 === 0;
            return (
              <line
                key={t}
                x1={FACE.c + Math.cos(a) * (major ? FACE.tickIn : FACE.tickIn + 3)}
                y1={FACE.c + Math.sin(a) * (major ? FACE.tickIn : FACE.tickIn + 3)}
                x2={FACE.c + Math.cos(a) * FACE.tickOut}
                y2={FACE.c + Math.sin(a) * FACE.tickOut}
                opacity={major ? 0.9 : 0.4}
              />
            );
          })}
        </g>

        {/* The week's own mean — every spoke is read against this. */}
        <circle cx={FACE.c} cy={FACE.c} r={FACE.baseline} fill="none" stroke="var(--line)" strokeWidth={1} strokeDasharray="2 3" />

        {/* The week as a shape. */}
        <path d={rose} fill="var(--gold)" fillOpacity={0.1} stroke="var(--gold)" strokeWidth={1} strokeOpacity={0.5} strokeLinejoin="round" />

        {days.map((d, i) => {
          if (d.totalShows === 0) return null;
          const from = point(i, FACE.baseline);
          const to = point(i, radiusFor(d));
          const hot = d.dow === hottest.dow;
          const above = d.avgJams >= mean;
          const colour = hot ? "var(--ember)" : above ? "var(--gold)" : "var(--faint)";
          return (
            <g key={d.dow}>
              <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={colour} strokeWidth={4} />
              <circle cx={to.x} cy={to.y} r={3.2} fill={colour} />
            </g>
          );
        })}

        {/* Day marks, with the reading beneath each one. */}
        {days.map((d, i) => {
          const p = point(i, FACE.label);
          const hot = d.totalShows > 0 && d.dow === hottest.dow;
          const delta = d.avgJams - mean;
          return (
            <g key={d.dow}>
              <text
                x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
                className="font-mono" fontSize={9} letterSpacing={1.2}
                fill={hot ? "var(--ember)" : "var(--muted)"}
              >
                {d.dayName.slice(0, 3).toUpperCase()}
              </text>
              <text
                x={p.x} y={p.y + 10} textAnchor="middle" dominantBaseline="central"
                className="font-mono" fontSize={8}
                fill={d.totalShows === 0 ? "var(--faint)" : hot ? "var(--ember)" : delta >= 0 ? "var(--gold)" : "var(--faint)"}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {d.totalShows === 0 ? "—" : `${delta >= 0 ? "+" : "−"}${Math.abs(delta).toFixed(2)}`}
              </text>
            </g>
          );
        })}

        {/* The reading at the centre of the instrument. */}
        <text x={FACE.c} y={FACE.c - 5} textAnchor="middle" className="font-mono" fontSize={17}
          fill="var(--ink)" style={{ fontVariantNumeric: "tabular-nums" }}>
          {mean.toFixed(2)}
        </text>
        <text x={FACE.c} y={FACE.c + 10} textAnchor="middle" className="font-mono" fontSize={6.5}
          letterSpacing={1.6} fill="var(--faint)">
          WEEK MEAN
        </text>
      </svg>

      <p className="max-w-xl text-center font-mono text-[0.62rem] leading-relaxed text-faint">
        Spokes read against the week&apos;s mean, not zero — outward is a jammier night than usual, inward a leaner one.
        The band is at its loosest on a <span className="text-ember">{hottest.dayName}</span> (
        {hottest.avgJams.toFixed(2)} jams a show, {(hottest.avgJams - mean >= 0 ? "+" : "−") +
          Math.abs(hottest.avgJams - mean).toFixed(2)} on the week).
      </p>
    </div>
  );
}

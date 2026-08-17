import { clsx } from "./clsx";

const W = 400;
const PAD = 4;
const BASE = 18;

function x(at: number, min: number, max: number): number {
  const t = max === min ? 0 : (Math.min(Math.max(at, min), max) - min) / (max - min);
  return PAD + t * (W - 2 * PAD);
}

/** Horizontal tick scale — the Braun face. Ten even minor ticks, taller
 * labeled majors, and (optionally) the one yellow hand: the reading. Crisp by
 * definition; the pen never draws instruments. */
export function TickRuler({
  min,
  max,
  majors,
  reading,
  className,
}: {
  min: number;
  max: number;
  majors: { at: number; label: string }[];
  reading?: { at: number; label?: string };
  className?: string;
}) {
  const minors = Array.from({ length: 11 }, (_, i) => PAD + (i * (W - 2 * PAD)) / 10);
  return (
    <span className={clsx("block", className)}>
      <svg viewBox={`0 0 ${W} 32`} className="block h-8 w-full" fill="none" aria-hidden="true">
        <path d={`M${PAD} ${BASE} H ${W - PAD}`} stroke="var(--line)" strokeWidth="1" />
        <g stroke="var(--faint)" strokeWidth="1">
          {minors.map((mx) => (
            <line key={mx} x1={mx} y1={BASE} x2={mx} y2={BASE - 4} />
          ))}
          {/* Index keys, not `m.at`: a degenerate scale (min === max, e.g. a
              Gauge over a single value) puts two majors at one position. */}
          {majors.map((m, i) => (
            <line key={`M${i}`} x1={x(m.at, min, max)} y1={BASE} x2={x(m.at, min, max)} y2={BASE - 8} />
          ))}
        </g>
        {majors.map((m, i) => (
          <text key={`L${i}`} x={x(m.at, min, max)} y={BASE + 11} fontSize="8" textAnchor="middle" fill="var(--faint)">
            {m.label}
          </text>
        ))}
        {reading && (
          <g>
            <line x1={x(reading.at, min, max)} y1={BASE} x2={x(reading.at, min, max)} y2={4} stroke="var(--hand)" strokeWidth="2" />
            <circle cx={x(reading.at, min, max)} cy={4} r="2.2" fill="var(--hand)" stroke="none" />
          </g>
        )}
      </svg>
      {reading?.label && <span className="sr-only">{reading.label}</span>}
    </span>
  );
}

/** A single value on its scale, value written out beside the pointer —
 * hand yellow marks it, text carries it. */
export function Gauge({
  min,
  max,
  value,
  unit,
  className,
}: {
  min: number;
  max: number;
  value: number;
  unit: string;
  className?: string;
}) {
  return (
    <span className={clsx("block", className)}>
      <TickRuler min={min} max={max} majors={[{ at: min, label: String(min) }, { at: max, label: String(max) }]} reading={{ at: value }} />
      <span className="mt-1 block text-sm text-ink">
        <b className="font-mono">{value}</b> {unit}
      </span>
    </span>
  );
}

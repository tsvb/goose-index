import type { SongPerf } from "@/lib/queries/songs";

function maxOf(ns: number[]): number { return Math.max(1, ...ns); }

export function PlaysPerYearChart({ data }: { data: { year: number; count: number }[] }) {
  const max = maxOf(data.map((d) => d.count));
  return (
    <div className="song-ppy" role="img" aria-label="Plays per year">
      {data.map((d) => (
        <div className="song-ppy-col" key={d.year}>
          <div className="song-ppy-bar" style={{ height: `${Math.round((d.count / max) * 100)}%` }} title={`${d.year}: ${d.count}`} />
          <div className="song-ppy-ct">{d.count}</div>
          <div className="song-ppy-yr">{String(d.year).slice(2)}</div>
        </div>
      ))}
    </div>
  );
}

export function SetPlacementBars({ placement }: { placement: { set1: number; set2: number; encore: number; opener: number; jammed: number } }) {
  const rows: [string, number][] = [["Set 1", placement.set1], ["Set 2", placement.set2], ["Encore", placement.encore], ["Opener", placement.opener], ["Jammed", placement.jammed]];
  return (
    <div className="song-bars">
      {rows.map(([label, pct]) => (
        <div className="song-barrow" key={label}>
          <span className="song-bar-label">{label}</span>
          <span className="song-bar"><span style={{ width: `${pct}%` }} /></span>
          <span className="song-bar-pct">{pct}%</span>
        </div>
      ))}
    </div>
  );
}

export function GapSparkline({ perfs }: { perfs: SongPerf[] }) {
  const series = [...perfs].reverse(); // oldest→newest
  const max = maxOf(series.map((p) => p.gap ?? 0));
  return (
    <div className="song-spark" role="img" aria-label="Gap before each performance">
      {series.map((p) => (
        <i key={p.uniqueId} className={p.isDustedOff ? "bust" : ""} style={{ height: `${Math.round(((p.gap ?? 0) / max) * 100)}%` }} title={`${p.date}: gap ${p.gap ?? 0}`} />
      ))}
    </div>
  );
}

export function MiniSparkline({ values }: { values: number[] }) {
  const max = maxOf(values);
  return (
    <span className="song-mspark" aria-hidden>
      {values.map((v, i) => <i key={i} style={{ height: `${Math.max(4, Math.round((v / max) * 100))}%` }} />)}
    </span>
  );
}

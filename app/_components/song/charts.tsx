import type { SongPerf } from "@/lib/queries/songs";

function maxOf(ns: number[]): number { return Math.max(1, ...ns); }

// role="group" (not "img"): an img role flattens the per-year count/label text
// out of the accessibility tree; group keeps that text readable while still
// naming the chart. `label` lets non-plays series (e.g. debuts) announce
// themselves correctly.
export function PlaysPerYearChart({ data, label = "Plays per year" }: { data: { year: number; count: number }[]; label?: string }) {
  const max = maxOf(data.map((d) => d.count));
  return (
    <div className="song-ppy" role="group" aria-label={label}>
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

const round2 = (n: number) => Math.round(n * 100) / 100;

// SVG sparkline geometry, in viewBox units (100 = full width). Computed rect widths
// replace the old flex-with-2px-gaps layout, which collapsed every bar to 0px above
// ~180 performances and rendered 2-play songs as half-container monoliths.
const SPARK = {
  viewW: 100, viewH: 100, height: 52,
  maxBars: 200, // bucket longer series so each bar keeps ≥ ~1px of rendered width
  barCap: 4, // ≤ 4% of the container per bar, so sparse songs stay slim
  gapUnits: 0.35, minSlotForGap: 1.2, minBarH: 2,
};

type SparkBar = { gap: number; ember: boolean; label: string };

function toSparkBars(series: SongPerf[], emberIds: Set<string>): SparkBar[] {
  const bar = (p: SongPerf): SparkBar => ({ gap: p.gap ?? 0, ember: emberIds.has(p.uniqueId), label: `${p.date}: gap ${p.gap ?? 0}` });
  if (series.length <= SPARK.maxBars) return series.map(bar);
  const out: SparkBar[] = [];
  for (let i = 0; i < SPARK.maxBars; i++) {
    const chunk = series.slice(Math.floor((i * series.length) / SPARK.maxBars), Math.floor(((i + 1) * series.length) / SPARK.maxBars));
    let top = chunk[0];
    for (const p of chunk) if ((p.gap ?? 0) > (top.gap ?? 0)) top = p;
    out.push({ ...bar(top), ember: chunk.some((p) => emberIds.has(p.uniqueId)) });
  }
  return out;
}

export function GapSparkline({ perfs }: { perfs: SongPerf[] }) {
  const series = [...perfs].reverse(); // oldest→newest
  const longest = Math.max(0, ...series.map((p) => p.gap ?? 0));
  const busts = series.filter((p) => p.isDustedOff).length;
  // Ember marks the notable droughts: every "Dusted Off" return, or — for songs that
  // have never been dusted off — the most recent occurrence of the longest gap, so
  // the chart always anchors the "Longest gap" fact and the legend never describes a
  // color that isn't on screen. (A dusted-off song's longest gap is itself a bust.)
  const emberIds = new Set(series.filter((p) => p.isDustedOff).map((p) => p.uniqueId));
  if (emberIds.size === 0 && longest > 0) {
    for (let i = series.length - 1; i >= 0; i--) {
      if ((series[i].gap ?? 0) === longest) { emberIds.add(series[i].uniqueId); break; }
    }
  }
  const bars = toSparkBars(series, emberIds);
  const max = maxOf(bars.map((b) => b.gap));
  const slot = SPARK.viewW / Math.max(bars.length, 1);
  const barW = Math.min(slot - (slot >= SPARK.minSlotForGap ? SPARK.gapUnits : 0), SPARK.barCap);
  const label = `Gap between plays across ${series.length} performance${series.length === 1 ? "" : "s"}; longest gap ${longest} show${longest === 1 ? "" : "s"}; ${busts} dusted-off return${busts === 1 ? "" : "s"}`;
  return (
    <svg role="img" aria-label={label} width="100%" height={SPARK.height} viewBox={`0 0 ${SPARK.viewW} ${SPARK.viewH}`} preserveAspectRatio="none" fill="var(--gold-deep, #c8902f)" fillOpacity={0.8} style={{ display: "block" }}>
      {bars.map((b, i) => {
        const h = Math.max(SPARK.minBarH, round2((b.gap / max) * SPARK.viewH));
        return (
          <rect key={i} x={round2(i * slot + (slot - barW) / 2)} y={round2(SPARK.viewH - h)} width={round2(barW)} height={h} {...(b.ember ? { fill: "var(--ember, #ff8a3d)", fillOpacity: 1 } : {})}>
            <title>{b.label}</title>
          </rect>
        );
      })}
    </svg>
  );
}

// Index-table activity sparkline: fixed 64×18, decorative (the Played column carries
// the value), so it stays aria-hidden. Same computed-width approach as GapSparkline,
// but all bars in a single <path> to keep the 600-row /songs payload lean.
const MSPARK = { w: 64, h: 18, barCap: 6, minBarH: 1 };
const round1 = (n: number) => Math.round(n * 10) / 10;

export function MiniSparkline({ values }: { values: number[] }) {
  const max = maxOf(values);
  const slot = MSPARK.w / Math.max(values.length, 1);
  const barW = round1(Math.min(slot - (slot >= 3 ? 1 : 0), MSPARK.barCap));
  const d = values
    .map((v, i) => {
      const h = Math.max(MSPARK.minBarH, round1((v / max) * MSPARK.h));
      return `M${round1(i * slot + (slot - barW) / 2)} ${round1(MSPARK.h - h)}h${barW}v${h}h${-barW}z`;
    })
    .join("");
  return (
    <svg aria-hidden width={MSPARK.w} height={MSPARK.h} viewBox={`0 0 ${MSPARK.w} ${MSPARK.h}`} style={{ verticalAlign: "middle" }}>
      <path d={d} fill="var(--gold-deep, #c8902f)" fillOpacity={0.85} />
    </svg>
  );
}

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GapSparkline, MiniSparkline } from "./charts";
import type { SongPerf } from "@/lib/queries/songs";

function perf(i: number, over: Partial<SongPerf> = {}): SongPerf {
  return {
    uniqueId: `p${i}`, date: `2020-01-${String((i % 28) + 1).padStart(2, "0")}`, showId: i, order: null,
    venue: null, city: null, state: null, setLabel: "Set 1", position: 1,
    trackTime: null, seconds: null, gap: (i % 7) + 1, isJam: false, isJamchart: false, isDustedOff: false,
    ...over,
  };
}

function rectWidths(html: string): number[] {
  return [...html.matchAll(/<rect[^>]*? width="([\d.]+)"/g)].map((m) => Number(m[1]));
}

describe("GapSparkline", () => {
  it("renders visible bars and bust rects for a 284-performance series", () => {
    const perfs = Array.from({ length: 284 }, (_, i) =>
      perf(i, i % 50 === 0 && i > 0 ? { gap: 40, isDustedOff: true } : {}),
    );
    const html = renderToStaticMarkup(<GapSparkline perfs={perfs} />);
    const widths = rectWidths(html);
    expect(widths.length).toBeGreaterThan(0);
    expect(widths.every((w) => w > 0)).toBe(true);
    expect(html).toContain("var(--ember");
  });

  it("summarizes the data in an aria-label instead of per-bar titles alone", () => {
    const perfs = Array.from({ length: 284 }, (_, i) =>
      perf(i, i === 100 ? { gap: 46, isDustedOff: true } : {}),
    );
    const html = renderToStaticMarkup(<GapSparkline perfs={perfs} />);
    expect(html).toContain('role="img"');
    expect(html).toContain('preserveAspectRatio="none"');
    expect(html).toContain("284 performances");
    expect(html).toContain("longest gap 46 shows");
    expect(html).toContain("1 dusted-off return");
  });

  it("caps bar width for a 2-performance series instead of rendering monoliths", () => {
    const perfs = [perf(0, { gap: null }), perf(1, { gap: 12 })];
    const html = renderToStaticMarkup(<GapSparkline perfs={perfs} />);
    const widths = rectWidths(html);
    expect(widths).toHaveLength(2);
    expect(widths.every((w) => w <= 4)).toBe(true); // ≤ 4% of the container each
  });

  it("renders a single capped bar for a one-performance song", () => {
    const html = renderToStaticMarkup(<GapSparkline perfs={[perf(0, { gap: null })]} />);
    const widths = rectWidths(html);
    expect(widths).toHaveLength(1);
    expect(widths[0]).toBeLessThanOrEqual(4);
    expect(html).toContain("across 1 performance;"); // singular
    expect(html).not.toContain("var(--ember"); // no gap to highlight
  });

  it("embers exactly one bar — the most recent longest gap — when a song has never been dusted off", () => {
    const perfs = Array.from({ length: 40 }, (_, i) => perf(i)); // gaps cycle 1..7, no busts
    const html = renderToStaticMarkup(<GapSparkline perfs={perfs} />);
    expect((html.match(/var\(--ember/g) ?? []).length).toBe(1);
    expect(html).toContain("longest gap 7 shows");
    expect(html).toContain("0 dusted-off returns");
  });
});

function pathBarWidths(html: string): number[] {
  const d = html.match(/<path d="([^"]*)"/)?.[1] ?? "";
  return [...d.matchAll(/h([\d.]+)v/g)].map((m) => Number(m[1]));
}

describe("MiniSparkline", () => {
  it("stays decorative and renders one bar per value", () => {
    const html = renderToStaticMarkup(<MiniSparkline values={Array.from({ length: 13 }, (_, i) => i)} />);
    expect(html).toContain("aria-hidden");
    expect(pathBarWidths(html)).toHaveLength(13);
  });

  it("keeps bars visible above the old ~64-bar flex collapse point", () => {
    const widths = pathBarWidths(renderToStaticMarkup(<MiniSparkline values={Array.from({ length: 100 }, (_, i) => (i % 5) + 1)} />));
    expect(widths).toHaveLength(100);
    expect(widths.every((w) => w > 0)).toBe(true);
  });

  it("caps bar width for a 2-value series", () => {
    const widths = pathBarWidths(renderToStaticMarkup(<MiniSparkline values={[3, 9]} />));
    expect(widths).toHaveLength(2);
    expect(widths.every((w) => w <= 6)).toBe(true);
  });
});

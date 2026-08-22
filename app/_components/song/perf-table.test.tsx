import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PerformanceTable } from "./perf-table";
import type { SongPerf } from "@/lib/queries/songs";

const base: SongPerf = {
  uniqueId: "x", date: "2026-06-12", showId: 9, order: 1, venue: "The Cap", city: "Port Chester", state: "NY",
  setLabel: "Set II", position: 4, trackTime: "14:20", seconds: 860, gap: 52, isJamchart: true, isDustedOff: true,
};
describe("PerformanceTable", () => {
  it("shows the Dusted Off marker with the gap number", () => {
    const html = renderToStaticMarkup(<PerformanceTable perfs={[base]} />);
    expect(html).toContain("Dusted Off");
    expect(html).toContain("52");
    expect(html).toContain('href="/shows/2026-06-12"');
  });

  it("names the rule the badge follows, since the Gap column repeats on a reprise", () => {
    // A song played twice a night shows the night's gap on both rows but is
    // badged once. Without the tooltip the unbadged twin looks like an
    // oversight rather than the reprise it is.
    const reprise: SongPerf = { ...base, uniqueId: "y", position: 8, isDustedOff: false };
    const html = renderToStaticMarkup(<PerformanceTable perfs={[base, reprise]} />);
    expect(html).toContain("First play in 52 shows");
    // Both rows still carry the night's gap — that is a fact about the show.
    expect(html.match(/52/g)?.length).toBeGreaterThanOrEqual(2);
    // ...but only one is the return.
    expect(html.match(/Dusted Off/g)).toHaveLength(1);
  });
});

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PerformanceTable } from "./perf-table";
import type { SongPerf } from "@/lib/queries/songs";

const base: SongPerf = {
  uniqueId: "x", date: "2026-06-12", showId: 9, order: 1, venue: "The Cap", city: "Port Chester", state: "NY",
  setLabel: "Set II", position: 4, trackTime: "14:20", seconds: 860, gap: 52, isJam: true, isJamchart: true, isDustedOff: true,
};
describe("PerformanceTable", () => {
  it("shows the Dusted Off marker with the gap number", () => {
    const html = renderToStaticMarkup(<PerformanceTable perfs={[base]} />);
    expect(html).toContain("Dusted Off");
    expect(html).toContain("52");
    expect(html).toContain('href="/shows/2026-06-12"');
  });
});

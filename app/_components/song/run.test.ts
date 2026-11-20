import { describe, it, expect } from "vitest";
import { songRun, goneForRecord, gapFraction, yearShares } from "./run";
import type { SongPerf } from "@/lib/queries/songs";

function perf(showId: number, date: string, gap: number | null, isDustedOff = false): SongPerf {
  return {
    uniqueId: `${showId}-${date}`, date, showId, order: null, venue: "Venue", city: null, state: null,
    setLabel: "Set I", position: 1, trackTime: null, seconds: null, gap, isJamchart: false, isDustedOff,
  };
}

// Newest first, as getSongPerformances returns them.
const PERFS = [
  perf(5, "2026-05-07", 51, true),
  perf(4, "2025-06-10", 3),
  perf(3, "2025-06-01", 0),
  perf(3, "2025-06-01", 0), // a reprise in the same show
  perf(2, "2025-05-30", 2),
  perf(1, "2025-05-01", null), // the debut
];

describe("songRun", () => {
  it("lays the plays out in shows since the debut, one night per show", () => {
    const run = songRun(PERFS, 61);
    expect(run.marks).toEqual([
      { at: 0, returned: false },
      { at: 3, returned: false },
      { at: 4, returned: false },
      { at: 8, returned: false },
      { at: 60, returned: true },
    ]);
    // The track runs on through the current gap to now.
    expect(run.total).toBe(60 + 61 + 1);
    expect(run.longest).toEqual({ from: 8, to: 60 });
  });

  it("handles a one-off and a song played every night", () => {
    expect(songRun([perf(1, "2025-05-01", null)], 4)).toEqual({ marks: [{ at: 0, returned: false }], total: 5, longest: null });
    const nightly = songRun([perf(3, "2025-05-03", 0), perf(2, "2025-05-02", 0), perf(1, "2025-05-01", null)], 0);
    expect(nightly.marks.map((m) => m.at)).toEqual([0, 1, 2]);
    expect(nightly.longest).toBeNull();
  });
});

describe("the gap against the song's own record", () => {
  it("calls a current gap past every finished one a record, and fills the ring", () => {
    expect(goneForRecord(61, 51)).toBe(true);
    expect(gapFraction(61, 51)).toBe(1);
  });
  it("otherwise closes the ring by the share of the longest gap", () => {
    expect(goneForRecord(1, 9)).toBe(false);
    expect(gapFraction(3, 9)).toBeCloseTo(1 / 3, 6);
    expect(gapFraction(0, 9)).toBe(0);
    expect(goneForRecord(5, null)).toBe(false);
    expect(gapFraction(5, null)).toBe(0);
  });
});

describe("yearShares", () => {
  it("counts distinct shows per year against the year's setlists", () => {
    const shares = yearShares([2025, 2026], PERFS, new Map([[2025, 64], [2026, 75]]));
    expect(shares).toEqual([
      { year: 2025, shows: 4, setlists: 64 },
      { year: 2026, shows: 1, setlists: 75 },
    ]);
  });
  it("keeps a year with no plays, and admits a year with no setlist count", () => {
    expect(yearShares([2024], PERFS, new Map())).toEqual([{ year: 2024, shows: 0, setlists: null }]);
  });
});

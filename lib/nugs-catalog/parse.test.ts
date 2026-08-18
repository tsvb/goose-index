import { describe, it, expect } from "vitest";
import { parseContainers, toISODate } from "./parse";

const envelope = (containers: unknown[]) => ({ Response: { containers } });

describe("toISODate", () => {
  it("converts the API's slashed date to ISO", () => {
    expect(toISODate("2026/08/16")).toBe("2026-08-16");
  });
  it("rejects anything that isn't a full date", () => {
    expect(toISODate("")).toBeNull();
    expect(toISODate(null)).toBeNull();
    expect(toISODate(undefined)).toBeNull();
    expect(toISODate("2026/08")).toBeNull();
    expect(toISODate(12345)).toBeNull();
  });
});

describe("parseContainers", () => {
  it("pulls the fields we store", () => {
    const rows = parseContainers(envelope([{
      containerID: 46887,
      performanceDateFormatted: "2026/08/16",
      venueName: "Grand Theatre at Grand Sierra Resort",
      venueCity: "Reno",
      venueState: "NV",
    }]));
    expect(rows).toEqual([{
      containerId: 46887,
      performanceDate: "2026-08-16",
      venueName: "Grand Theatre at Grand Sierra Resort",
      venueCity: "Reno",
      venueState: "NV",
      hasVideo: false,
    }]);
  });

  it("marks video when asked", () => {
    const rows = parseContainers(
      envelope([{ containerID: 46883, performanceDateFormatted: "2026/07/04" }]),
      { hasVideo: true });
    expect(rows[0].hasVideo).toBe(true);
    expect(rows[0].venueName).toBeNull();
  });

  // Real catalog rows carry an empty performanceDateFormatted. Date is the join
  // key, so a row without one cannot be matched to anything and is dropped.
  it("drops rows with no usable date", () => {
    expect(parseContainers(envelope([
      { containerID: 1, performanceDateFormatted: "" },
      { containerID: 2, performanceDateFormatted: "2026/07/04" },
    ]))).toHaveLength(1);
  });

  it("drops rows with no container id", () => {
    expect(parseContainers(envelope([
      { performanceDateFormatted: "2026/07/04" },
    ]))).toEqual([]);
  });

  it("returns empty for a shape it doesn't recognise instead of throwing", () => {
    expect(parseContainers({})).toEqual([]);
    expect(parseContainers(null)).toEqual([]);
    expect(parseContainers({ Response: {} })).toEqual([]);
  });
});

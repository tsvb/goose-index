import { describe, it, expect } from "vitest";
import { liveCandidateDate } from "./live";

// July dates are EDT (UTC-4); January dates are EST (UTC-5).
const at = (iso: string) => new Date(iso);

describe("liveCandidateDate", () => {
  it("show-day evening (ET) → that date", () => {
    expect(liveCandidateDate(at("2026-07-04T20:00:00-04:00"))).toBe("2026-07-04");
    expect(liveCandidateDate(at("2026-07-04T15:00:00-04:00"))).toBe("2026-07-04"); // window opens 3pm
    expect(liveCandidateDate(at("2026-07-04T23:59:00-04:00"))).toBe("2026-07-04");
  });

  it("after-midnight tail (until 4am ET) → the previous date", () => {
    expect(liveCandidateDate(at("2026-07-05T02:30:00-04:00"))).toBe("2026-07-04");
    expect(liveCandidateDate(at("2026-07-05T03:59:00-04:00"))).toBe("2026-07-04");
  });

  it("outside the window → null", () => {
    expect(liveCandidateDate(at("2026-07-04T10:00:00-04:00"))).toBeNull();
    expect(liveCandidateDate(at("2026-07-05T04:00:00-04:00"))).toBeNull(); // tail closes at 4am
    expect(liveCandidateDate(at("2026-07-04T14:59:00-04:00"))).toBeNull();
  });

  it("crosses month and year boundaries in the tail", () => {
    expect(liveCandidateDate(at("2026-08-01T01:00:00-04:00"))).toBe("2026-07-31");
    expect(liveCandidateDate(at("2027-01-01T01:00:00-05:00"))).toBe("2026-12-31");
  });

  it("anchors to ET regardless of the input's own zone", () => {
    // 8pm ET expressed as next-day 00:00 UTC.
    expect(liveCandidateDate(at("2026-07-05T00:00:00Z"))).toBe("2026-07-04");
  });
});

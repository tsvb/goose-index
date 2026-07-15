import { describe, it, expect } from "vitest";
import { issueFormStamp, checkFormStamp } from "./formstamp";

describe("formstamp", () => {
  const t0 = 1_752_500_000_000;
  it("accepts a genuine stamp older than the minimum age", () => {
    const stamp = issueFormStamp(t0);
    expect(checkFormStamp(stamp, 3000, t0 + 5000)).toBe(true);
  });
  it("rejects too-fast submissions, tampering, stale stamps, and garbage", () => {
    const stamp = issueFormStamp(t0);
    expect(checkFormStamp(stamp, 3000, t0 + 1000)).toBe(false);              // bot-fast
    expect(checkFormStamp(`${t0 - 9999}.${stamp.split(".")[1]}`, 3000, t0)).toBe(false); // forged ts
    expect(checkFormStamp(stamp, 3000, t0 + 25 * 3_600_000)).toBe(false);    // stale
    expect(checkFormStamp("nonsense", 3000, t0)).toBe(false);
    expect(checkFormStamp(null, 3000, t0)).toBe(false);
  });
});

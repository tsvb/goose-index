import { describe, it, expect } from "vitest";
import { formatTimeoutReport, isConnectTimeout, loopLag, startLoopLagMonitor } from "./loop-lag";

describe("isConnectTimeout", () => {
  it("finds the driver's code through Drizzle's wrapping", () => {
    const driver = Object.assign(new Error("write CONNECT_TIMEOUT undefined:undefined"), { code: "CONNECT_TIMEOUT" });
    expect(isConnectTimeout(driver)).toBe(true);
    expect(isConnectTimeout(new Error("Failed query: select 1", { cause: driver }))).toBe(true);
  });
  it("ignores every other failure", () => {
    expect(isConnectTimeout(Object.assign(new Error("x"), { code: "XX000" }))).toBe(false);
    expect(isConnectTimeout(new Error("Failed query", { cause: new Error("statement timeout") }))).toBe(false);
    expect(isConnectTimeout(undefined)).toBe(false);
    expect(isConnectTimeout("CONNECT_TIMEOUT")).toBe(false);
  });
});

describe("formatTimeoutReport", () => {
  const load = { readsActive: 8, readsWaiting: 3, rssMb: 412, uptimeS: 640 };
  it("puts the lag beside the instance's load, both windows", () => {
    const line = formatTimeoutReport(
      { current: { maxMs: 11840, p99Ms: 9120, meanMs: 310, seconds: 22 }, previous: { maxMs: 3020, p99Ms: 1450, meanMs: 95, seconds: 60 } },
      load,
    );
    expect(line).toBe(
      "[db] CONNECT_TIMEOUT · event loop lag max 11840ms p99 9120ms mean 310ms over 22s; previous minute max 3020ms p99 1450ms mean 95ms over 60s · reads 8 active, 3 waiting · rss 412MB · instance up 640s",
    );
  });
  it("says when nothing was measured", () => {
    expect(formatTimeoutReport(null, load)).toContain("event loop lag not measured");
  });
});

describe("the monitor", () => {
  it("starts once and reports a window", () => {
    startLoopLagMonitor();
    startLoopLagMonitor();
    const lag = loopLag();
    expect(lag).not.toBeNull();
    expect(lag!.current.maxMs).toBeGreaterThanOrEqual(0);
  });
});

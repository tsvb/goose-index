import { describe, it, expect } from "vitest";
import { createLimiter } from "./limit";

/** A task that reports how many of its kind are running, and waits to be released. */
function tracker() {
  let running = 0;
  let peak = 0;
  const releases: (() => void)[] = [];
  const task = () =>
    new Promise<void>((resolve) => {
      running++;
      peak = Math.max(peak, running);
      releases.push(() => { running--; resolve(); });
    });
  return { task, releases, peak: () => peak, running: () => running };
}

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("createLimiter", () => {
  // The pool holds 10 connections; an 11th concurrent query is pipelined onto a
  // busy one, which is what Supavisor deadlocks on.
  it("never runs more than max at once, and still runs them all", async () => {
    const limit = createLimiter(3);
    const t = tracker();
    const all = Promise.all(Array.from({ length: 10 }, () => limit(t.task)));
    await tick();
    expect(t.running()).toBe(3);
    while (t.releases.length) { t.releases.shift()!(); await tick(); }
    await all;
    expect(t.peak()).toBe(3);
    expect(t.running()).toBe(0);
  });

  it("returns the call's value and passes its error through", async () => {
    const limit = createLimiter(1);
    expect(await limit(() => 7)).toBe(7);
    await expect(limit(async () => { throw new Error("read failed"); })).rejects.toThrow("read failed");
  });

  it("frees the slot when a call throws", async () => {
    const limit = createLimiter(1);
    await limit(async () => { throw new Error("x"); }).catch(() => {});
    expect(await limit(() => "next")).toBe("next");
  });

  // One cached read built on another: the inner call must not queue behind
  // slots held by outer calls that are themselves waiting on inner ones.
  it("runs a nested call on the slot its caller holds", async () => {
    const limit = createLimiter(2);
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => limit(async () => { await tick(); return limit(async () => i); })),
    );
    expect(results).toEqual([0, 1, 2, 3, 4, 5]);
  });
});

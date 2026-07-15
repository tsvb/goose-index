import { describe, it, expect } from "vitest";
import {
  checkFloors, checkIntegrity, checkSpotShow, checkEarliestShow, checkForumCounters, summarize,
} from "./checks";

describe("checkFloors", () => {
  it("passes when all above floors, fails the low one", () => {
    const ok = checkFloors({ shows: 853, songs: 613, venues: 591, performances: 15000 });
    expect(ok.every((r) => r.pass)).toBe(true);
    const bad = checkFloors({ shows: 10, songs: 613, venues: 591, performances: 15000 });
    expect(bad.find((r) => r.name === "shows floor")!.pass).toBe(false);
  });
});

describe("checkIntegrity", () => {
  it("passes only with zero orphans/dups", () => {
    expect(checkIntegrity({ perfNoShow: 0, perfNoSong: 0, showNoVenue: 0, dupPositions: 0 })
      .every((r) => r.pass)).toBe(true);
    expect(checkIntegrity({ perfNoShow: 3, perfNoSong: 0, showNoVenue: 0, dupPositions: 0 })
      .find((r) => r.name === "performances reference a show")!.pass).toBe(false);
  });
});

describe("checkSpotShow", () => {
  it("passes for 15 acoustic performances", () => {
    expect(checkSpotShow({ performanceCount: 15, notes: "first set acoustic" }).pass).toBe(true);
    expect(checkSpotShow({ performanceCount: 12, notes: "first set acoustic" }).pass).toBe(false);
    expect(checkSpotShow({ performanceCount: 15, notes: null }).pass).toBe(false);
  });
});

describe("checkEarliestShow", () => {
  it("expects 2014-09-27 (Goose's earliest show)", () => {
    expect(checkEarliestShow("2014-09-27").pass).toBe(true);
    expect(checkEarliestShow("2012-01-12").pass).toBe(false);
  });
});

describe("checkForumCounters", () => {
  it("passes at zero drift, fails otherwise", () => {
    expect(checkForumCounters({ boardThreads: 0, boardPosts: 0, threadReplies: 0, userPosts: 0 })
      .every((r) => r.pass)).toBe(true);
    const drifted = checkForumCounters({ boardThreads: 1, boardPosts: 0, threadReplies: 0, userPosts: 0 });
    expect(drifted.some((r) => !r.pass)).toBe(true);
  });
});

describe("summarize", () => {
  it("ok only when every result passes", () => {
    expect(summarize([{ name: "a", pass: true, detail: "" }]).ok).toBe(true);
    expect(summarize([{ name: "a", pass: true, detail: "" }, { name: "b", pass: false, detail: "" }]).ok)
      .toBe(false);
  });
});

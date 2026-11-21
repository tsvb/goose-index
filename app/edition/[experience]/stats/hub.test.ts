import { describe, it, expect } from "vitest";
import { catalogSplit, sharePct } from "./hub";

describe("catalogSplit", () => {
  it("splits the catalog into the staples that carry half, the rest, and the rarities' tail", () => {
    // 817 plays: the top two (484) cross half; five songs at 3 plays or fewer.
    const s = catalogSplit([284, 200, 150, 100, 50, 20, 5, 3, 2, 1, 1, 1], 3)!;
    expect(s.head).toEqual({ songs: 2, plays: 484 });
    expect(s.rest).toEqual({ songs: 5, plays: 325 });
    expect(s.tail).toEqual({ songs: 5, plays: 8 });
    expect(s.songs).toBe(12);
    expect(s.plays).toBe(817);
  });

  it("keeps the groups apart when there's no tail, and when the head reaches the ceiling", () => {
    expect(catalogSplit([10, 10, 10, 10], 3)).toMatchObject({ head: { songs: 2 }, rest: { songs: 2 }, tail: { songs: 0, plays: 0 } });
    expect(catalogSplit([3, 2, 1], 3)).toMatchObject({ head: { songs: 1 }, rest: { songs: 0 }, tail: { songs: 2 } });
  });

  it("says nothing for an empty catalog", () => {
    expect(catalogSplit([], 3)).toBeNull();
  });
});

describe("sharePct", () => {
  it("rounds to whole percent, but never calls a real sliver 0", () => {
    expect(sharePct(484, 817)).toBe(59);
    expect(sharePct(1, 1000)).toBe(1);
    expect(sharePct(0, 1000)).toBe(0);
    expect(sharePct(5, 0)).toBe(0);
  });
});

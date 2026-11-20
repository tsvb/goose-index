import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/queries/songs", () => ({ RARITY_MAX_PLAYS: 3 }));

import { CatalogProfile, halfPoint, tailStart, profilePath, playsStep, rankMajors } from "./catalog-profile";

describe("halfPoint", () => {
  it("is the smallest k whose top-k plays reach half of the total", () => {
    expect(halfPoint([])).toBe(0);
    expect(halfPoint([10])).toBe(1);
    expect(halfPoint([5, 3, 2])).toBe(1); // 5 of 10 is exactly half
    expect(halfPoint([4, 3, 2, 1])).toBe(2); // 4 < 5, 7 ≥ 5
    expect(halfPoint([1, 1, 1, 1])).toBe(2);
  });
});

describe("tailStart", () => {
  it("finds where the ranked series drops to the ceiling, or the end when it never does", () => {
    expect(tailStart([5, 4, 3, 1], 3)).toBe(2);
    expect(tailStart([9, 8], 3)).toBe(2);
    expect(tailStart([3, 1], 3)).toBe(0);
  });
});

describe("profilePath", () => {
  it("collapses runs of equal plays into one step", () => {
    const d = profilePath([3, 1, 1, 1], 3);
    // Two steps (3, then the run of 1s), not four.
    expect(d).toBe("M0 1000 L0.0 0.0 L250.0 0.0 L250.0 666.7 L1000.0 666.7 L1000 1000 Z");
  });
});

describe("scales", () => {
  it("picks the coarsest round step that still fits a few gridlines", () => {
    expect(playsStep(220)).toBe(100);
    expect(playsStep(60)).toBe(20);
    expect(playsStep(5)).toBe(5);
  });

  it("labels rank 1, each hundredth, and the last — unless a hundredth would sit on the last", () => {
    expect(rankMajors(368)).toEqual([1, 100, 200, 300, 368]);
    expect(rankMajors(305)).toEqual([1, 100, 200, 305]);
    expect(rankMajors(50)).toEqual([1, 50]);
    expect(rankMajors(1)).toEqual([1]);
  });
});

describe("CatalogProfile", () => {
  const plays = [284, 200, 150, 100, 50, 20, 5, 3, 2, 1, 1, 1];

  it("draws one hand reading, written out beside the mark", () => {
    const html = renderToStaticMarkup(<CatalogProfile plays={plays} topN={100} />);
    expect(html.match(/stroke="var\(--hand\)"/g)).toHaveLength(1);
    expect(html.match(/bg-hand/g)).toHaveLength(1);
    expect(html).toContain(">2</b> songs are half of all plays");
    expect(html).toContain("The top 2 account for half of all plays");
  });

  it("brackets the head as the cut's window and the tail at the rarity ceiling", () => {
    const html = renderToStaticMarkup(<CatalogProfile plays={plays} topN={100} />);
    expect(html).toContain("most played · top 12");
    expect(html).toContain('href="/stats/most-played"');
    expect(html).toContain("3 plays or fewer · 5 songs");
    expect(html).toContain('href="/stats/rarities"');
    // The tail bracket starts where the series first hits 3 plays: 7 of 12 → 58.33%.
    expect(html).toMatch(/left:58\.3333/);
  });

  it("keeps the catalog in steel and the scale in hairlines", () => {
    const html = renderToStaticMarkup(<CatalogProfile plays={plays} topN={100} />);
    expect(html).toContain('fill="var(--steel)"');
    expect(html).toContain('stroke="var(--line-soft)"'); // gridlines at 100 and 200
    expect(html).toContain(">100<");
    expect(html).toContain(">200<");
    expect(html).not.toMatch(/text-hand/); // hand is a mark, never text
  });

  it("renders nothing for an empty catalog", () => {
    expect(renderToStaticMarkup(<CatalogProfile plays={[]} topN={100} />)).toBe("");
  });
});

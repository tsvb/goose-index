import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { penRandom, PenRule, PenNote, PenArrow, PenCircle } from "./pen";

describe("penRandom", () => {
  it("is deterministic per seed", () => {
    const a1 = penRandom("ledger-1"), a2 = penRandom("ledger-1"), b = penRandom("ledger-2");
    const seqA1 = [a1(), a1(), a1()], seqA2 = [a2(), a2(), a2()], seqB = [b(), b(), b()];
    expect(seqA1).toEqual(seqA2);
    expect(seqA1).not.toEqual(seqB);
  });
  it("stays in [0, 1)", () => {
    const r = penRandom("bounds");
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("PenRule", () => {
  it("renders the same path for the same seed (SSR-stable)", () => {
    expect(renderToStaticMarkup(<PenRule seed="s1" />)).toBe(renderToStaticMarkup(<PenRule seed="s1" />));
  });
  it("different seeds draw different strokes", () => {
    expect(renderToStaticMarkup(<PenRule seed="s1" />)).not.toBe(renderToStaticMarkup(<PenRule seed="s2" />));
  });
  it("is decorative and pencil-coloured", () => {
    const html = renderToStaticMarkup(<PenRule seed="s1" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("text-pencil");
    expect(html).toContain('preserveAspectRatio="none"');
  });
  it("faint strength thins the stroke", () => {
    const strong = renderToStaticMarkup(<PenRule seed="s1" />);
    const faint = renderToStaticMarkup(<PenRule seed="s1" strength="faint" />);
    expect(faint).toContain("opacity");
    expect(strong).not.toBe(faint);
  });
});

describe("PenNote", () => {
  it("is a pencil italic paragraph", () => {
    const html = renderToStaticMarkup(<PenNote>only 25 mondays</PenNote>);
    expect(html).toContain("<p");
    expect(html).toContain("text-pencil");
    expect(html).toContain("italic");
    expect(html).toContain("only 25 mondays");
  });
});

describe("PenArrow / PenCircle", () => {
  it("render deterministic decorative SVGs", () => {
    expect(renderToStaticMarkup(<PenArrow seed="a" />)).toBe(renderToStaticMarkup(<PenArrow seed="a" />));
    expect(renderToStaticMarkup(<PenCircle seed="c" />)).toBe(renderToStaticMarkup(<PenCircle seed="c" />));
    expect(renderToStaticMarkup(<PenArrow seed="a" />)).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(<PenCircle seed="c" />)).toContain('aria-hidden="true"');
  });
  it("arrow flips with direction", () => {
    expect(renderToStaticMarkup(<PenArrow seed="a" direction="left" />)).not.toBe(
      renderToStaticMarkup(<PenArrow seed="a" direction="right" />),
    );
  });
});

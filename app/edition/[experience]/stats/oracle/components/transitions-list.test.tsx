import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TransitionsList } from "./transitions-list";
import type { TransitionRow } from "@/lib/queries/discoveries";

function transition(sourceName: string, targetName: string, count: number): TransitionRow {
  return {
    sourceName,
    sourceSlug: sourceName.toLowerCase().replace(/\s+/g, "-"),
    targetName,
    targetSlug: targetName.toLowerCase().replace(/\s+/g, "-"),
    count,
  };
}

describe("TransitionsList", () => {
  const data = [transition("Wysteria", "Tumble", 12), transition("Slow Ready", "31", 3)];

  it("draws the splice in steel, the scale's own color — never gold", () => {
    const html = renderToStaticMarkup(<TransitionsList edition="functional" data={data} />);
    expect(html).toContain('stroke="var(--steel)"');
    expect(html).toContain('fill="var(--steel)"');
    expect(html).not.toContain("var(--gold)");
  });

  it("names both songs of a transition, with the count as evidence", () => {
    const html = renderToStaticMarkup(<TransitionsList edition="functional" data={data} />);
    expect(html).toContain("Wysteria");
    expect(html).toContain("Tumble");
    expect(html).toContain("12");
    expect(html).toContain("Read as a setlist");
  });

  it("renders an empty state rather than an empty list", () => {
    expect(renderToStaticMarkup(<TransitionsList edition="functional" data={[]} />)).toContain("No transitions found yet");
  });
});

describe("TransitionsList segue bars (3.0)", () => {
  const data = [transition("Wysteria", "Tumble", 12), transition("Slow Ready", "31", 3)];
  const html = renderToStaticMarkup(<TransitionsList edition="fancy" data={data} />);

  it("draws a round-capped bar per pair, thicker for the more played segue, with no arrowhead", () => {
    const widths = [...html.matchAll(/data-role="segue"[^>]*stroke-width="([\d.]+)" stroke-linecap="round"/g)].map((m) =>
      Number(m[1]),
    );
    expect(widths).toEqual([9, 2]);
    expect(html).not.toContain("<path");
  });

  it("captions the bar, not a splice", () => {
    expect(html).toContain("The bar thickens with how often the band plays the segue.");
    expect(html).not.toMatch(/splice/i);
  });
});

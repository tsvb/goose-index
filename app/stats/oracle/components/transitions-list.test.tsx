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

  it("draws the splice in steel, the scale's own colour — never gold", () => {
    const html = renderToStaticMarkup(<TransitionsList data={data} />);
    expect(html).toContain('stroke="var(--steel)"');
    expect(html).toContain('fill="var(--steel)"');
    expect(html).not.toContain("var(--gold)");
  });

  it("names both songs of a transition, with the count as evidence", () => {
    const html = renderToStaticMarkup(<TransitionsList data={data} />);
    expect(html).toContain("Wysteria");
    expect(html).toContain("Tumble");
    expect(html).toContain("12");
    expect(html).toContain("Read as a setlist");
  });

  it("renders an empty state rather than an empty list", () => {
    expect(renderToStaticMarkup(<TransitionsList data={[]} />)).toContain("No transitions found yet");
  });
});

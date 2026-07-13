import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CareerChart } from "./career-chart";
import type { CareerYear } from "@/lib/queries/dimensions";

function year(over: Partial<CareerYear> & { year: number; shows: number }): CareerYear {
  return {
    documented: over.shows,
    performances: 100,
    uniqueSongs: 50,
    debuts: 5,
    partial: false,
    ...over,
  };
}

const YEARS: CareerYear[] = [
  // 2017 is the band's busiest year AND its worst-documented: 107 shows logged,
  // setlists for 37 of them.
  year({ year: 2017, shows: 107, documented: 37 }),
  year({ year: 2022, shows: 87, documented: 87 }),
  year({ year: 2026, shows: 44, documented: 44, partial: true }),
];

describe("CareerChart", () => {
  it("hatches the shows that were logged but never had a setlist", () => {
    // Hiding them would let the chart claim a documentation it doesn't have.
    const html = renderToStaticMarkup(<CareerChart years={YEARS} />);
    expect(html).toContain("repeating-linear-gradient");
    expect(html).toContain("setlists for 37");
  });

  it("draws no hatching at all for a fully documented year", () => {
    const html = renderToStaticMarkup(<CareerChart years={[year({ year: 2022, shows: 87 })]} />);
    expect(html).not.toContain("repeating-linear-gradient");
  });

  it("dashes the year still running, so a short bar isn't read as a slump", () => {
    const html = renderToStaticMarkup(<CareerChart years={YEARS} />);
    expect(html).toContain("dashed");
    expect(html).toContain("still running");
  });

  it("never crowns a partial year as the peak", () => {
    // A year in progress can't be "the busiest ever" — it isn't over.
    const html = renderToStaticMarkup(
      <CareerChart years={[year({ year: 2022, shows: 87 }), year({ year: 2026, shows: 200, partial: true })]} />,
    );
    expect(html).toContain("2022");
    expect(html).not.toContain("2026 is the busiest");
  });

  it("marks the busiest completed year", () => {
    const html = renderToStaticMarkup(<CareerChart years={YEARS} />);
    expect(html).toContain("var(--ember)");
    expect(html).toContain("107 shows");
  });

  it("links each year to its own page", () => {
    const html = renderToStaticMarkup(<CareerChart years={YEARS} />);
    expect(html).toContain('href="/years/2017"');
    expect(html).toContain('href="/years/2026"');
  });

  it("renders nothing rather than an empty frame", () => {
    expect(renderToStaticMarkup(<CareerChart years={[]} />)).toBe("");
  });
});

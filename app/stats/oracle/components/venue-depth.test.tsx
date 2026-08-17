import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VenueDepth } from "./venue-depth";
import type { DeepestVenueRow } from "@/lib/queries/discoveries";

function venue(name: string, jamPercentage: number, venueId = 1): DeepestVenueRow {
  return {
    venueId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    totalShows: 10,
    totalPerformances: 120,
    totalJams: Math.round((jamPercentage / 100) * 120),
    jamPercentage,
  };
}

describe("VenueDepth", () => {
  it("draws a normal needle in steel and a red-zone needle/dot in ember", () => {
    // fullScale rounds up from the hottest reading (92 -> 100), so 92% falls
    // in the red zone (>= 75% of full scale) and 40% does not.
    const data = [venue("Deep Room", 92, 1), venue("Shallow Room", 40, 2)];
    const html = renderToStaticMarkup(<VenueDepth data={data} />);
    // stroke-width="1.8" is the needle's own width — the graduation ticks
    // (also stroke ember in the red zone) use 1.3/0.7, so this isolates it.
    const needles = [...html.matchAll(/<line[^>]*stroke="var\(--(ember|steel)\)" stroke-width="1\.8"/g)].map((m) => m[1]);
    expect(needles).toEqual(["ember", "steel"]);
    expect(html).not.toContain("var(--gold)");
  });

  it("names every venue and its jam percentage as evidence", () => {
    const data = [venue("Deep Room", 92, 1)];
    const html = renderToStaticMarkup(<VenueDepth data={data} />);
    expect(html).toContain("Deep Room");
    expect(html).toContain("92.0");
    expect(html).toContain("jam-tagged");
  });

  it("renders an empty state rather than an empty grid", () => {
    expect(renderToStaticMarkup(<VenueDepth data={[]} />)).toContain("No venues qualify yet");
  });
});

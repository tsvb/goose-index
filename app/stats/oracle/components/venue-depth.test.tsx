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
    const html = renderToStaticMarkup(<VenueDepth edition="functional" data={data} />);
    // stroke-width="1.8" is the needle's own width — the graduation ticks
    // (also stroke ember in the red zone) use 1.3/0.7, so this isolates it.
    const needles = [...html.matchAll(/<line[^>]*stroke="var\(--(ember|steel)\)" stroke-width="1\.8"/g)].map((m) => m[1]);
    expect(needles).toEqual(["ember", "steel"]);
    expect(html).not.toContain("var(--gold)");
  });

  it("names every venue and its jam percentage as evidence", () => {
    const data = [venue("Deep Room", 92, 1)];
    const html = renderToStaticMarkup(<VenueDepth edition="functional" data={data} />);
    expect(html).toContain("Deep Room");
    expect(html).toContain("92.0");
    expect(html).toContain("jam-tagged");
  });

  it("renders an empty state rather than an empty grid", () => {
    expect(renderToStaticMarkup(<VenueDepth edition="functional" data={[]} />)).toContain("No venues qualify yet");
  });
});

describe("VenueDepth level tracks (3.0)", () => {
  // Full scale 40 (from 39.0), zone from 30.
  const data = [venue("GLC Live", 39, 1), venue("Ryman", 27.8, 2)];
  const html = renderToStaticMarkup(<VenueDepth edition="fancy" data={data} />);

  it("draws one level track per room, and no meter", () => {
    expect([...html.matchAll(/data-role="level"/g)]).toHaveLength(2);
    expect(html).not.toContain("<svg");
  });

  it("turns only the reading past the zone yellow", () => {
    const zones = [...html.matchAll(/data-role="zone"[^>]*style="left:75%;width:([\d.]+)%"/g)].map((m) => Number(m[1]));
    expect(zones).toHaveLength(1);
    expect(zones[0]).toBeCloseTo(22.5, 5);
    // The percentage text in the zone is heat text (ember), not the mark color.
    expect(html).toContain('text-ember">39.0%');
    expect(html).toContain('text-ink">27.8%');
  });

  it("captions the track honestly: yellow at the notch, never 'red' or 'dial'", () => {
    expect(html).toContain("Each track runs to 40% jam-tagged and turns yellow past the notch at 30%.");
    expect(html).not.toMatch(/\bred\b|dial|needle/i);
  });

  it("keeps the counts in text, so a hot three-show room stays honest", () => {
    expect(html).toContain("47/120 jams · 10 shows");
  });
});

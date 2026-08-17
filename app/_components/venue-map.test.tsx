import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VenueMap } from "./venue-map";
import type { StateShows, CountryShows } from "@/lib/queries/dimensions";

// Locates the rendered <path ...> opening tag for a state by its <title>
// text (unique per state), so assertions can inspect that path's own fill
// without depending on Object.entries(US_STATE_PATHS) ordering.
function pathTagFor(html: string, code: string): string {
  const marker = `<title>${code} — `;
  const titleIdx = html.indexOf(marker);
  if (titleIdx === -1) throw new Error(`no <title> for ${code} in rendered markup`);
  const start = html.lastIndexOf("<path", titleIdx);
  const end = html.indexOf(">", start);
  return html.slice(start, end);
}

describe("VenueMap", () => {
  const states: StateShows[] = [
    { state: "CT", shows: 135, venues: 9 }, // hottest
    { state: "NY", shows: 40, venues: 12 },
  ];

  it("marks the hottest state with the hand reading", () => {
    const html = renderToStaticMarkup(<VenueMap states={states} countries={[]} />);
    expect(pathTagFor(html, "CT")).toContain('fill="var(--hand)"');
    expect(pathTagFor(html, "NY")).toContain('fill="var(--steel)"'); // played, not hottest
  });

  it("still draws a never-played state, in its neutral fill — absence isn't omission", () => {
    const html = renderToStaticMarkup(<VenueMap states={states} countries={[]} />);
    // WY never appears in `states`, but every state path is drawn regardless.
    const wy = pathTagFor(html, "WY");
    expect(wy).toContain('fill="var(--surface-2)"');
    expect(html).toContain("WY — never played");
  });

  it("prints the legend, with the ramp in steel and the top swatch in hand", () => {
    const html = renderToStaticMarkup(<VenueMap states={states} countries={[]} />);
    expect(html).toContain("Fewer shows");
    expect(html).toContain("More");
    expect(html).toContain("var(--steel)"); // ramp swatches
    expect(html).toContain("var(--hand)"); // top-of-ramp swatch
    expect(html).toContain("Shaded on a log scale");
  });

  it("gives the 'beyond the us' country show-count the content color, not the retired gold utility", () => {
    const countries: CountryShows[] = [{ country: "Canada", shows: 6, venues: 4 }];
    const html = renderToStaticMarkup(<VenueMap states={states} countries={countries} />);
    const idx = html.indexOf(">6<");
    const spanTag = html.slice(html.lastIndexOf("<span", idx), idx);
    expect(spanTag).toContain("text-ink");
    expect(spanTag).not.toContain("text-gold");
  });
});

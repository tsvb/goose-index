import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShowRow, ShowCard } from "./show-card";
import type { ShowSummary } from "@/lib/queries/shows";

const show: ShowSummary = {
  showId: 42, date: "2024-08-30", order: null,
  venue: "Dillon Amphitheater", city: "Dillon", state: "CO", country: "USA",
  tour: "Summer Tour 2024", tourId: 130, songCount: 18, hasNotes: true,
};

describe("ShowRow default (browse lists)", () => {
  it("shows the mono date, venue title, location, and tour eyebrow", () => {
    const html = renderToStaticMarkup(<ShowRow show={show} />);
    expect(html).toContain("2024-08-30");
    expect(html).toContain("Dillon Amphitheater");
    expect(html).toContain("Dillon, CO");
    expect(html).toContain("Summer Tour 2024");
    expect(html).toContain('href="/shows/2024-08-30"');
    expect(html).toContain("18 songs");
  });

  it("disambiguates multi-show dates through showHref", () => {
    const html = renderToStaticMarkup(<ShowRow show={{ ...show, order: 2 }} />);
    expect(html).toContain('href="/shows/2024-08-30?n=2"');
  });
});

describe("ShowRow context=venue (venue pages)", () => {
  it("promotes the date to the display slot and drops the repeated venue", () => {
    const html = renderToStaticMarkup(<ShowRow show={show} context="venue" />);
    expect(html).toContain("August 30, 2024"); // date in the display slot
    expect(html).toContain("Friday");          // weekday takes the sub-line
    expect(html).not.toContain("Dillon Amphitheater");
    expect(html).not.toContain("Dillon, CO");
    expect(html).toContain("Summer Tour 2024"); // tour shown instead of venue
    expect(html).not.toContain("2024-08-30<"); // the mono date column is gone
  });

  it("survives a show with no tour", () => {
    const html = renderToStaticMarkup(<ShowRow show={{ ...show, tour: null, tourId: null }} context="venue" />);
    expect(html).toContain("August 30, 2024");
    expect(html).toContain("18 songs");
  });
});

describe("ShowRow context=tour (tour pages)", () => {
  it("keeps the venue but drops the repeated tour eyebrow", () => {
    const html = renderToStaticMarkup(<ShowRow show={show} context="tour" />);
    expect(html).toContain("Dillon Amphitheater");
    expect(html).toContain("Dillon, CO");
    expect(html).toContain("2024-08-30");
    expect(html).not.toContain("Summer Tour 2024");
  });
});

describe("ShowCard", () => {
  it("still renders the full grid card (unchanged by row contexts)", () => {
    const html = renderToStaticMarkup(<ShowCard show={show} />);
    expect(html).toContain("August 30");
    expect(html).toContain("Dillon Amphitheater");
    expect(html).toContain("Summer Tour 2024");
  });
});

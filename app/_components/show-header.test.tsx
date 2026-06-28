import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShowHeader } from "./show-header";
import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";

const show: ShowDetail = {
  showId: 1, date: "2026-06-26", order: null, venue: "Red Hat Amphitheater",
  city: "Raleigh", state: "NC", country: "USA", tour: "Summer Tour 2026", tourId: 7,
  songCount: 2, hasNotes: false, venueId: 9, permalink: null, notes: null,
};
const setlist = [
  { setType: "Set", setNumber: "1", trackTime: "9:00" },
  { setType: "Set", setNumber: "1", trackTime: "8:00" },
] as SetlistEntry[];

const nugsShow = { showId: 1, date: "2024-04-20", order: 1, venue: "The Salt Shed", city: "Chicago", state: "IL", country: "USA", tour: null, tourId: null, songCount: 2, hasNotes: false, venueId: 9, permalink: "p", notes: null } as ShowDetail;
const emptySetlist: SetlistEntry[] = [];

describe("ShowHeader", () => {
  it("minimal renders a breadcrumb, an h1, and a facts table — no hero glow", () => {
    const html = renderToStaticMarkup(<ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="minimal" />);
    expect(html).toContain("<h1");
    expect(html).toContain("<table");
    expect(html).toContain("Red Hat Amphitheater");
    expect(html).not.toContain("stage-glow");
  });
  it("functional renders compact stat chips, no big hero", () => {
    const html = renderToStaticMarkup(<ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="functional" />);
    expect(html).toContain("2026");
    expect(html).not.toContain("stage-glow");
  });
  it("fancy renders the hero with the stage glow and eyebrow", () => {
    const html = renderToStaticMarkup(<ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="fancy" />);
    expect(html).toContain("stage-glow");
    expect(html).toContain("eyebrow");
  });
});

describe("ShowHeader nugs affordance", () => {
  for (const exp of ["fancy", "functional", "minimal"] as const) {
    it(`emits a show-level applenugs Listen link in ${exp}`, () => {
      const html = renderToStaticMarkup(<ShowHeader show={nugsShow} date="2024-04-20" setlist={emptySetlist} experience={exp} />);
      // renderToStaticMarkup HTML-encodes & in attributes; check both the scheme and the encoded venue
      expect(html).toContain("applenugs://show/2024-04-20?artist=Goose");
      expect(html).toContain("The%20Salt%20Shed");
      expect(html).toContain("media=video"); // the Watch variant
    });
  }
});

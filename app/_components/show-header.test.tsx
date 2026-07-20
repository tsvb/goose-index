import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShowHeader } from "./show-header";
import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";

const show: ShowDetail = {
  showId: 1, date: "2026-06-26", order: null, venue: "Red Hat Amphitheater",
  city: "Raleigh", state: "NC", country: "USA", tour: "Summer Tour 2026", tourId: 7,
  songCount: 2, hasNotes: false, venueId: 9, permalink: null, notes: null, bandcampUrl: null,
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
  it("functional renders the date as a real h1 (the page's only one)", () => {
    const html = renderToStaticMarkup(<ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="functional" />);
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toMatch(/<h1[^>]*>June 26, 2026<\/h1>/);
  });
  it("fancy renders the hero with the stage glow and eyebrow", () => {
    const html = renderToStaticMarkup(<ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="fancy" />);
    expect(html).toContain("stage-glow");
    expect(html).toContain("eyebrow");
  });
});

describe("ShowHeader almanac entry stamp + masthead hook", () => {
  it("fancy stamps the computed entry number and tags the masthead", () => {
    const html = renderToStaticMarkup(
      <ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="fancy" entryNumber={812} />,
    );
    expect(html).toContain('class="entry-stamp"');
    expect(html).toContain("<span>SHOW</span>");
    expect(html).toContain("<span>No. 812</span>");
    expect(html).toContain("almanac-masthead");
  });
  it("renders no stamp when the entry number is unknown — upcoming or unlogged shows", () => {
    for (const entryNumber of [null, undefined]) {
      const html = renderToStaticMarkup(
        <ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="fancy" entryNumber={entryNumber} />,
      );
      expect(html).not.toContain("entry-stamp");
    }
  });
  it("minimal and functional never render the stamp", () => {
    for (const exp of ["minimal", "functional"] as const) {
      const html = renderToStaticMarkup(
        <ShowHeader show={show} date="2026-06-26" setlist={setlist} experience={exp} entryNumber={812} />,
      );
      expect(html).not.toContain("entry-stamp");
      expect(html).not.toContain("No. 812");
    }
  });
});

describe("ShowHeader nugs affordance", () => {
  const nugsSetlist = [
    { setType: "Set", setNumber: "1", trackTime: "9:00" },
    { setType: "Set", setNumber: "1", trackTime: "8:00" },
  ] as SetlistEntry[];
  for (const exp of ["fancy", "functional", "minimal"] as const) {
    it(`emits a show-level applenugs Listen link in ${exp} when a setlist exists`, () => {
      const html = renderToStaticMarkup(<ShowHeader show={nugsShow} date="2024-04-20" setlist={nugsSetlist} experience={exp} />);
      // renderToStaticMarkup HTML-encodes & in attributes; check both the scheme and the encoded venue
      expect(html).toContain("applenugs://show/2024-04-20?artist=Goose");
      expect(html).toContain("The%20Salt%20Shed");
      expect(html).toContain("media=video"); // the Watch variant
    });
  }
});

describe("ShowHeader with no setlist yet", () => {
  for (const exp of ["fancy", "functional", "minimal"] as const) {
    it(`hides the Listen/Watch links and the zero stats row in ${exp}`, () => {
      const html = renderToStaticMarkup(<ShowHeader show={nugsShow} date="2024-04-20" setlist={emptySetlist} experience={exp} />);
      expect(html).not.toContain("applenugs://");
      expect(html).not.toContain("0 songs");
      expect(html).toContain("not yet");
    });
  }
  it("fancy keeps the elgoose source link visible while waiting", () => {
    const html = renderToStaticMarkup(<ShowHeader show={nugsShow} date="2024-04-20" setlist={emptySetlist} experience="fancy" />);
    expect(html).toContain("elgoose.net/setlists/p");
  });
});

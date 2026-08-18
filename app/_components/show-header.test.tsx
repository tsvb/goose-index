import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShowHeader } from "./show-header";
import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";

const show: ShowDetail = {
  showId: 1, date: "2026-06-26", order: null, venue: "Red Hat Amphitheater",
  city: "Raleigh", state: "NC", country: "USA", tour: "Summer Tour 2026", tourId: 7,
  songCount: 2, hasNotes: false, venueId: 9, permalink: null, notes: null, bandcampUrl: null,
  nugsContainerId: null, nugsHasVideo: null,
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

describe("ShowHeader nugs.net control", () => {
  const withContainer = { ...nugsShow, nugsContainerId: 46887, nugsHasVideo: true } as ShowDetail;
  const withoutContainer = { ...nugsShow, nugsContainerId: null, nugsHasVideo: null } as ShowDetail;

  for (const experience of ["minimal", "functional", "fancy"] as const) {
    it(`${experience}: links the exact release when a container is known`, () => {
      const html = renderToStaticMarkup(
        <ShowHeader show={withContainer} date="2024-04-20" setlist={setlist} experience={experience} />);
      expect(html).toContain("https://play.nugs.net/release/46887");
    });

    it(`${experience}: omits the control when no container is known`, () => {
      const html = renderToStaticMarkup(
        <ShowHeader show={withoutContainer} date="2024-04-20" setlist={setlist} experience={experience} />);
      expect(html).not.toContain("play.nugs.net/release/");
    });
  }

  it("the Watch button falls back to the video route, and Listen to the audio route", () => {
    const html = renderToStaticMarkup(
      <ShowHeader show={withContainer} date="2024-04-20" setlist={setlist} experience="fancy" />);
    // Tie each fallback to ITS anchor — a bare toContain would pass even if the
    // two fallbacks were swapped, since both URLs appear somewhere on the page.
    expect(html).toMatch(/<a[^>]*class="nugs-show watch"[^>]*data-fallback="https:\/\/play\.nugs\.net\/watch\/release\/46887"/);
    expect(html).toMatch(/<a[^>]*class="nugs-show"[^>]*data-fallback="https:\/\/play\.nugs\.net\/release\/46887"/);
  });

  it("without a container the fallbacks stay the artist+date search", () => {
    const html = renderToStaticMarkup(
      <ShowHeader show={withoutContainer} date="2024-04-20" setlist={setlist} experience="fancy" />);
    expect(html).toContain("play.nugs.net/#/search?searchTerm=Goose%202024-04-20");
  });

  // 283 of 485 containers are audio-only (measured 2026-08-18): sending an
  // app-less Watch click to /watch/release/<id> for those would land on a
  // container with no video. Watch's fallback is the exact video page only
  // when has_video is true; otherwise it degrades to the pre-branch search —
  // Listen's fallback is unaffected either way.
  it("the Watch fallback degrades to search when the container has no video", () => {
    const audioOnly = { ...nugsShow, nugsContainerId: 46887, nugsHasVideo: false } as ShowDetail;
    const html = renderToStaticMarkup(
      <ShowHeader show={audioOnly} date="2024-04-20" setlist={setlist} experience="fancy" />);
    expect(html).toMatch(/<a[^>]*class="nugs-show watch"[^>]*data-fallback="https:\/\/play\.nugs\.net\/#\/search\?searchTerm=Goose%202024-04-20"/);
    expect(html).toMatch(/<a[^>]*class="nugs-show"[^>]*data-fallback="https:\/\/play\.nugs\.net\/release\/46887"/);
  });

  it("the Watch fallback degrades to search when has_video is unknown (null)", () => {
    const unknownVideo = { ...nugsShow, nugsContainerId: 46887, nugsHasVideo: null } as ShowDetail;
    const html = renderToStaticMarkup(
      <ShowHeader show={unknownVideo} date="2024-04-20" setlist={setlist} experience="fancy" />);
    expect(html).toMatch(/<a[^>]*class="nugs-show watch"[^>]*data-fallback="https:\/\/play\.nugs\.net\/#\/search\?searchTerm=Goose%202024-04-20"/);
  });
});

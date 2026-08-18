import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({
  experience: "fancy",
  recent: [] as Record<string, unknown>[],
  details: [] as Record<string, unknown>[],
  setlist: [] as Record<string, unknown>[],
  coverage: { resolved: 476, total: 855 },
}));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/shows", () => ({
  getRecentShows: async () => h.recent,
  getShowDetails: async () => h.details,
  getSetlist: async () => h.setlist,
  getNugsCoverage: async () => h.coverage,
}));

import ListenLinksPage, { metadata } from "./page";
import { canonicalUrl } from "@/lib/site";
import { nugsShowHref } from "@/lib/nugs";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

beforeEach(() => {
  h.experience = "fancy";
  h.recent = [{ showId: 9, date: "2024-04-20", order: 1, venue: "The Salt Shed", city: "Chicago",
    state: "IL", country: "USA", tour: null, tourId: null, songCount: 2, hasNotes: false }];
  h.details = [{ showId: 9, date: "2024-04-20", order: 1, venue: "The Salt Shed", city: "Chicago",
    state: "IL", country: "USA", tour: null, tourId: null, songCount: 2, hasNotes: false,
    venueId: 1, permalink: null, notes: null, bandcampUrl: null,
    nugsContainerId: 46887, nugsHasVideo: true }];
  h.setlist = [{ uniqueId: "1", songId: 1, song: "Hot Tea", slug: "hot-tea", setType: "Set",
    setNumber: "1", position: 1, trackTime: null, transition: null, isJamchart: false,
    jamchartNotes: null, isJam: false, isReprise: false, isOriginal: true,
    originalArtist: null, footnote: null, gap: null, isDustedOff: false }];
});

describe("ListenLinksPage", () => {
  it("declares its canonical URL", () => {
    expect(metadata.alternates?.canonical).toBe(canonicalUrl("/listen-links"));
  });

  it("feeds the most recent show into the example, matched by showId", async () => {
    const html = renderToStaticMarkup(await ListenLinksPage());
    expect(html).toContain(esc(nugsShowHref({ date: "2024-04-20", venue: "The Salt Shed" })));
    expect(html).toContain("476 of 855");
  });

  it("on a two-show day, uses the row for THIS show, not the first row", async () => {
    // Two rows for the date; the recent show is the SECOND. A regression to a
    // bare details[0] would pick Early Venue's row (no container) and fail both
    // assertions below.
    h.recent = [{ showId: 10, date: "2024-04-20", order: 2, venue: "Late Venue", city: "Chicago",
      state: "IL", country: "USA", tour: null, tourId: null, songCount: 2, hasNotes: false }];
    h.details = [
      { ...h.details[0], showId: 9, order: 1, venue: "Early Venue", nugsContainerId: null, nugsHasVideo: null },
      { ...h.details[0], showId: 10, order: 2, venue: "Late Venue", nugsContainerId: 111, nugsHasVideo: false },
    ];
    const html = renderToStaticMarkup(await ListenLinksPage());
    expect(html).toContain(esc(nugsShowHref({ date: "2024-04-20", venue: "Late Venue" })));
    expect(html).toContain("https://play.nugs.net/release/111");
    expect(html).not.toContain("Early%20Venue");
  });

  it("renders the explanation even with an empty database", async () => {
    h.recent = [];
    const html = renderToStaticMarkup(await ListenLinksPage());
    expect(html).toContain("How the listen links work");
    // Not "applenugs://show/" bare — the dev reference's grammar line legitimately
    // contains that prefix. A real example URL always has a date, which starts
    // with a digit (see app/_components/listen-links.test.tsx for the same fix).
    expect(html).not.toContain("applenugs://show/2");
  });
});

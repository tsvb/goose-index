import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({
  experience: "fancy",
  recent: [] as Record<string, unknown>[],
  tonight: [] as Record<string, unknown>[],
  onThisDay: [] as Record<string, unknown>[],
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {}, push() {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/stats", () => ({
  getOverviewStats: async () => ({
    showsPlayed: 392, upcoming: 3, songs: 613, venues: 191, performances: 6459,
    firstDate: "2016-08-03", lastPlayedDate: "2026-07-11",
  }),
}));
vi.mock("@/lib/queries/shows", () => ({
  getRecentShows: async () => h.recent,
  getUpcomingShows: async () => [],
  getOnThisDay: async () => h.onThisDay,
  getTonightShows: async () => h.tonight,
}));

import Home from "./page";

function show(showId: number, date: string, venue: string, order = 1) {
  return {
    showId, date, order, venue, city: "Port Chester", state: "NY", country: "USA",
    tour: null, tourId: null, songCount: 0, hasNotes: false,
  };
}

async function render() {
  return renderToStaticMarkup(await Home());
}

beforeEach(() => {
  h.experience = "fancy";
  h.tonight = [];
  h.onThisDay = [];
  h.recent = [
    show(9, "2026-07-10", "Red Rocks", 1),
    show(8, "2026-07-09", "The Cap", 1),
  ];
});

describe("Home section headings", () => {
  it("renders 'On this day' and 'Latest shows' as real h2s under the single h1", async () => {
    h.onThisDay = [show(7, "2016-07-11", "Nectar's", 1)];
    const html = await render();
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toMatch(/<h2[^>]*>On this day/);
    expect(html).toMatch(/<h2[^>]*>Latest shows<\/h2>/);
  });
});

describe("Home Tonight banner", () => {
  it("renders no banner when nothing is dated today", async () => {
    const html = await render();
    expect(html).not.toContain("live-pill");
    expect(html).not.toContain("The setlist will appear here live");
  });

  it("hoists tonight's show into a banner linking to the show page", async () => {
    h.tonight = [show(99, "2026-07-11", "Tonight Amphitheatre")];
    const html = await render();
    expect(html).toContain("live-pill");
    expect(html).toContain("Tonight Amphitheatre");
    expect(html).toContain('href="/shows/2026-07-11"');
    expect(html).toContain("The setlist will appear here live");
  });

  it("excludes tonight's show from Latest shows", async () => {
    const tonightShow = show(99, "2026-07-11", "Tonight Amphitheatre");
    h.tonight = [tonightShow];
    h.recent = [tonightShow, ...h.recent]; // getRecentShows still includes today
    const html = await render();
    // Once in the banner, not again as a "no setlist" card under Freshly logged.
    expect(html.split("Tonight Amphitheatre").length - 1).toBe(1);
    expect(html).toContain("Red Rocks"); // the rest of the recents survive
  });

  it("minimal experience gets a Tonight MetaTable row instead of a banner", async () => {
    h.experience = "minimal";
    h.tonight = [show(99, "2026-07-11", "Tonight Amphitheatre")];
    const html = await render();
    expect(html).not.toContain("live-pill");
    expect(html).toContain("Tonight");
    expect(html).toContain('href="/shows/2026-07-11"');
    expect(html).toContain("the setlist will appear live");
  });
});

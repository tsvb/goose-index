import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({
  experience: "fancy",
  recent: [] as Record<string, unknown>[],
  tonight: [] as Record<string, unknown>[],
  onThisDay: [] as Record<string, unknown>[],
  firstDate: "2016-08-03" as string | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {}, push() {} }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/stats", () => ({
  getOverviewStats: async () => ({
    showsPlayed: 392, upcoming: 3, songs: 613, songsInCatalog: 621, venues: 191, performances: 6459,
    firstDate: h.firstDate, lastPlayedDate: "2026-07-11",
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
  h.firstDate = "2016-08-03";
  h.recent = [
    show(9, "2026-07-10", "Red Rocks", 1),
    show(8, "2026-07-09", "The Cap", 1),
  ];
});

describe("Home section headings", () => {
  it("renders 'on this day' and 'latest shows' as real h2s under the single h1", async () => {
    h.onThisDay = [show(7, "2016-07-11", "Nectar's", 1)];
    const html = await render();
    expect(html.match(/<h1/g)).toHaveLength(1);
    // The date tail is computed from the fixture's onThisDay date, not hard-coded.
    expect(html).toMatch(/<h2[^>]*>on this day/);
    expect(html).toContain("on this day · jul 11");
    expect(html).toMatch(/<h2[^>]*>latest shows<\/h2>/);
  });
});

describe("Home layout — the card grid is gone", () => {
  it("renders no card-grid markup anywhere on the page", async () => {
    h.onThisDay = [show(7, "2016-07-11", "Nectar's", 1)];
    h.tonight = [show(99, "2026-07-11", "Tonight Amphitheatre")];
    const html = await render();
    expect(html).not.toMatch(/rounded-lg|surface-card|hover:-translate-y/);
  });
});

describe("Home hero + browse funnels", () => {
  it("labels the hero figure as 'shows played', not a bare 'shows'", async () => {
    const html = await render();
    expect(html).toContain("shows played");
    // The old ambiguous label is gone (would leave a stray "shows" tile).
    expect(html).not.toMatch(/>shows<\/span>/);
  });

  it("funnels into songs and stats from the contents rail", async () => {
    const html = await render();
    // Songs row — count comes from the whole songbook, not the played-song total.
    expect(html).toContain('href="/songs"');
    expect(html).toContain("621 songs, sorted any way");
    // Stats row.
    expect(html).toContain('href="/stats"');
    expect(html).toContain("cuts, gaps, and debuts");
  });

  it("minimal browse line links Songs and Stats too", async () => {
    h.experience = "minimal";
    const html = await render();
    expect(html).toContain('href="/songs"');
    expect(html).toContain('href="/stats"');
    expect(html).toContain("Shows played");
  });
});

describe("Home year ruler", () => {
  it("renders the record's span when firstDate exists", async () => {
    const html = await render();
    expect(html).toContain("the record, 2016 → now");
    expect(html).toContain("text-hand");
  });

  it("renders no ruler without a firstDate", async () => {
    h.firstDate = null;
    const html = await render();
    expect(html).not.toContain("the record,");
  });
});

describe("Home Tonight banner", () => {
  it("renders no tonight entry when nothing is dated today", async () => {
    const html = await render();
    expect(html).not.toContain("bg-hand");
    expect(html).not.toContain("the setlist will appear live");
  });

  it("hoists tonight's show into a ledger entry linking to the show page", async () => {
    h.tonight = [show(99, "2026-07-11", "Tonight Amphitheatre")];
    const html = await render();
    expect(html).toContain("tonight");
    expect(html).toContain("text-ember"); // the word is AA text, not the mark-only hand
    expect(html).toContain("bg-hand"); // the dot is the mark
    expect(html).toContain("Tonight Amphitheatre");
    expect(html).toContain('href="/shows/2026-07-11"');
    expect(html).toContain("the setlist will appear live");
  });

  it("excludes tonight's show from latest shows", async () => {
    const tonightShow = show(99, "2026-07-11", "Tonight Amphitheatre");
    h.tonight = [tonightShow];
    h.recent = [tonightShow, ...h.recent]; // getRecentShows still includes today
    const html = await render();
    // Once in the tonight ledger, not again as a "no setlist" entry under Latest shows.
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

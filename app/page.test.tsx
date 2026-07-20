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
    showsPlayed: 392, upcoming: 3, songs: 613, songsInCatalog: 621, venues: 191, performances: 6459,
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
  it("renders 'On This Day' and 'Latest shows' as real h2s under the single h1", async () => {
    h.onThisDay = [show(7, "2016-07-11", "Nectar's", 1)];
    const html = await render();
    expect(html.match(/<h1/g)).toHaveLength(1);
    // Casing is unified on "On This Day" everywhere user-facing.
    expect(html).toMatch(/<h2[^>]*>On This Day/);
    expect(html).not.toContain("On this day");
    expect(html).toMatch(/<h2[^>]*>Latest shows<\/h2>/);
  });
});

describe("Home hero + browse funnels", () => {
  it("labels the hero show count as 'Shows played', not a bare 'Shows'", async () => {
    const html = await render();
    expect(html).toContain("Shows played");
    // The old ambiguous label is gone (would leave a stray "Shows" tile).
    expect(html).not.toMatch(/>Shows<\/span>/);
  });

  it("funnels into Songs and Stats from the browse rail", async () => {
    const html = await render();
    // Songs row — count comes from the whole songbook, not the played-song total.
    expect(html).toContain('href="/songs"');
    expect(html).toContain("621 songs, sorted any way");
    // Stats row.
    expect(html).toContain('href="/stats"');
    expect(html).toContain("Cuts, gaps, and debuts");
  });

  it("minimal browse line links Songs and Stats too", async () => {
    h.experience = "minimal";
    const html = await render();
    expect(html).toContain('href="/songs"');
    expect(html).toContain('href="/stats"');
    expect(html).toContain("Shows played");
  });
});

describe("Home almanac nameplate", () => {
  it("computes every nameplate figure from the stats — volume, number, est, span", async () => {
    // Pin the clock so the volume (years since first show) and the year span
    // are deterministic; the component derives both at render time.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T12:00:00Z"));
    try {
      const html = await render();
      expect(html).toContain('class="almanac-nameplate"');
      expect(html).toContain("GOOSE INDEX");
      // firstDate 2016 → VOL. X in 2026, EST. 2016; showsPlayed 392 → No. 392.
      expect(html).toContain("VOL. X · No. 392 · EST. 2016");
      expect(html).toContain("AN ALMANAC OF EVERY SHOW · 2016–2026");
    } finally {
      vi.useRealTimers();
    }
  });

  it("adds no heading — the hero h1 stays the page's only h1", async () => {
    const html = await render();
    expect(html).toContain("almanac-nameplate");
    expect(html.match(/<h1/g)).toHaveLength(1);
  });

  it("keeps the nameplate out of minimal and functional", async () => {
    for (const exp of ["minimal", "functional"] as const) {
      h.experience = exp;
      const html = await render();
      expect(html).not.toContain("almanac-nameplate");
    }
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

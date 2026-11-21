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
  return renderToStaticMarkup(await Home({}));
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
    h.tonight = [show(99, "2026-07-11", "Tonight Amphitheater")];
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

describe("Home hero figures", () => {
  it("each figure links to the page it counts", async () => {
    const html = await render();
    expect(html).toContain("shows played");
    expect(html).toContain("unique songs");
    // The tiles are anchors: shows → /shows, both song figures → /songs,
    // venues → /venues. Contents rows link there too, so assert the pairing
    // of label and href inside one anchor.
    expect(html).toMatch(/<a[^>]*href="\/shows"[^>]*>(?:(?!<\/a>).)*shows played/s);
    expect(html).toMatch(/<a[^>]*href="\/songs"[^>]*>(?:(?!<\/a>).)*songs played/s);
    expect(html).toMatch(/<a[^>]*href="\/songs"[^>]*>(?:(?!<\/a>).)*unique songs/s);
    expect(html).toMatch(/<a[^>]*href="\/venues"[^>]*>(?:(?!<\/a>).)*venues/s);
  });

  it("the year ruler is gone — it stated a span the tiles already imply", async () => {
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

  it("hoists tonight's show into 3.0's blister pack, linking to the show page", async () => {
    h.tonight = [show(99, "2026-07-11", "Tonight Amphitheater")];
    const html = await render();
    expect(html).toContain("tonight");
    // The one pack on the site: card stock, a bubble holding tonight's poster
    // (the night has no release cover yet), the Tonight state on a sticker.
    expect(html).toContain("tonight-pack");
    expect(html).not.toContain("yeti-bubble-empty");
    expect(html).toContain('class="yeti-tile yeti-poster"');
    expect(html).toContain('<span class="yeti-poster-city" style="--chars:7">Port Chester</span>');
    expect(html).toContain('<span class="yeti-poster-region">NY</span>');
    expect(html).toContain('<span class="yeti-poster-date">sat · jul 11</span>');
    expect(html).toContain('<span class="yeti-label">Tonight</span>');
    expect(html).toContain("Tonight Amphitheater");
    expect(html).toContain('href="/shows/2026-07-11"');
    expect(html).toContain("the setlist will appear live");
  });

  it("excludes tonight's show from latest shows", async () => {
    const tonightShow = show(99, "2026-07-11", "Tonight Amphitheater");
    h.tonight = [tonightShow];
    h.recent = [tonightShow, ...h.recent]; // getRecentShows still includes today
    const html = await render();
    // Once in the tonight ledger, not again as a "no setlist" entry under Latest shows.
    expect(html.split("Tonight Amphitheater").length - 1).toBe(1);
    expect(html).toContain("Red Rocks"); // the rest of the recents survive
  });

  it("minimal experience gets a Tonight MetaTable row instead of a banner", async () => {
    h.experience = "minimal";
    h.tonight = [show(99, "2026-07-11", "Tonight Amphitheater")];
    const html = await render();
    expect(html).not.toContain("live-flag");
    expect(html).toContain("Tonight");
    expect(html).toContain('href="/shows/2026-07-11"');
    expect(html).toContain("the setlist will appear live");
  });
});

describe("Home covers (3.0)", () => {
  it("leads a row with its Bandcamp cover, else the date tile", async () => {
    h.recent = [
      { ...show(9, "2026-07-10", "Red Rocks", 1), artId: "3912345678" },
      show(8, "2026-07-09", "The Cap", 1),
    ];
    const html = await render();
    expect(html).toContain('src="https://f4.bcbits.com/img/a3912345678_7.jpg"');
    // The row's link already names the show, so the cover is decorative there.
    expect(html).toContain('alt=""');
    // The Cap has no release: its square is the date tile.
    expect(html).toMatch(/<span class="yeti-tile-d">9<\/span>/);
    // With the square holding the date, the date moves under the venue.
    expect(html).toContain("jul 10, 2026 · Port Chester, NY");
  });

  it("never builds an image URL from an art id that isn't digits", async () => {
    h.recent = [{ ...show(9, "2026-07-10", "Red Rocks", 1), artId: "1/../../evil" }];
    const html = await render();
    expect(html).not.toContain("<img");
    expect(html).toMatch(/<span class="yeti-tile-d">10<\/span>/);
  });

  it("keeps 2.0's rows as they were", async () => {
    h.experience = "functional";
    h.recent = [{ ...show(9, "2026-07-10", "Red Rocks", 1), artId: "3912345678" }];
    const html = await render();
    expect(html).not.toContain("bcbits.com");
    expect(html).not.toContain("yeti-tile");
  });
});

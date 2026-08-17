import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({
  latest: null as null | { showId: number; date: string; isToday: boolean; page: number },
  rows: [] as Record<string, unknown>[],
  total: 1,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh() {}, push() {} }) }));
vi.mock("@/lib/experience.server", () => ({ getExperience: async () => "fancy" }));
vi.mock("@/lib/queries/dimensions", () => ({
  listYears: async () => [
    { year: 2024, shows: 10, songs: 100 },
    { year: 2023, shows: 8, songs: 80 },
  ],
  listTours: async () => [
    { tourId: 1, name: "Summer Tour 2024", year: 2024, shows: 5, start: "2024-06-01", end: "2024-08-01" },
    { tourId: 2, name: "Fall Tour 2024", year: 2024, shows: 4, start: "2024-09-01", end: "2024-11-01" },
    { tourId: 3, name: "Winter Tour 2023", year: 2023, shows: 3, start: "2023-12-01", end: "2023-12-20" },
  ],
}));
vi.mock("@/lib/queries/shows", () => ({
  listShows: async () => ({ rows: h.rows, total: h.total }),
  findLatestPastShow: async () => h.latest,
}));

import ShowsBrowsePage from "./page";

async function render(params: Record<string, string> = {}) {
  const el = await ShowsBrowsePage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.latest = { showId: 42, date: "2024-06-15", isToday: false, page: 1 };
  h.rows = [{
    showId: 42, date: "2024-06-15", order: 1, venue: "The Cap", city: "Port Chester",
    state: "NY", country: "USA", tour: "Summer Tour 2024", tourId: 1, songCount: 12, hasNotes: false,
  }];
  h.total = 1;
});

describe("ShowsBrowsePage head", () => {
  it("renders the lowercase kicker, the 'every show' title, and the count line as meta", async () => {
    const html = await render();
    expect(html).toContain("goose index · shows");
    expect(html.match(/<h1[^>]*>/g)?.length).toBe(1);
    expect(html).toMatch(/<h1[^>]*>every show<\/h1>/);
  });
});

describe("ShowsBrowsePage controls", () => {
  it("offers 50/100 per-page options with 50 the default", async () => {
    const html = await render();
    expect(html).toContain(">50<");
    expect(html).toContain(">100<");
    // default per=50 means the 100 link must carry per=100
    expect(html).toContain("per=100");
  });

  it("marks the placeholder pager ends as disabled for assistive tech", async () => {
    h.total = 150; // 3 pages at the default per=50
    const first = await render();
    expect(first).toContain("page 1 of 3");
    expect(first).toContain('aria-disabled="true"'); // Previous placeholder on page 1
    const last = await render({ page: "3" });
    expect(last).toContain("page 3 of 3");
    expect(last).toContain('aria-disabled="true"'); // Next placeholder on the last page
  });

  it("hides the tour filter row until a year is chosen", async () => {
    const noYear = await render();
    expect(noYear).not.toContain("All 2024"); // no clear-tour filter
    expect(noYear).not.toContain("tour=1"); // no tour filter links

    const withYear = await render({ year: "2024" });
    expect(withYear).toContain("All 2024"); // clear-tour filter present
    expect(withYear).toContain("year=2024&amp;tour=1"); // Summer Tour 2024 filter
    expect(withYear).toContain("year=2024&amp;tour=2"); // Fall Tour 2024 filter
    expect(withYear).not.toContain("tour=3"); // Winter Tour 2023 belongs to 2023
  });

  it("marks the active year filter with steel text, not the 'All' filter", async () => {
    const html = await render({ year: "2024" });
    const yearIdx = html.indexOf(">2024<");
    const yearTag = html.slice(html.lastIndexOf("<a", yearIdx), yearIdx);
    expect(yearTag).toContain("text-steel");
    expect(yearTag).toContain("font-semibold");

    const allIdx = html.indexOf(">All<");
    const allTag = html.slice(html.lastIndexOf("<a", allIdx), allIdx);
    expect(allTag).not.toContain("text-steel");
  });

  it("adds a companion year page link only when a year filter is active", async () => {
    const noYear = await render();
    expect(noYear).not.toContain('href="/years/');

    const withYear = await render({ year: "2024" });
    expect(withYear).toContain('href="/years/2024"');
    expect(withYear).toContain("year 2024 page");
  });

  it("shows a 'most recent show' jump that deep-links to the show anchor", async () => {
    const html = await render();
    expect(html).toContain("most recent show");
    expect(html).toContain("#show-42");
  });

  it("targets the right page in the jump link", async () => {
    h.latest = { showId: 42, date: "2024-06-15", isToday: false, page: 3 };
    const html = await render();
    expect(html).toContain("page=3#show-42");
  });

  it("relabels the jump as tonight's show when a show is today", async () => {
    h.latest = { showId: 99, date: "2024-06-29", isToday: true, page: 1 };
    const html = await render();
    expect(html).toContain("tonight’s show");
    expect(html).not.toContain("most recent show");
  });

  it("hides the jump entirely when there is no past show", async () => {
    h.latest = null;
    const html = await render();
    expect(html).not.toContain("most recent show");
    expect(html).not.toContain("tonight’s show");
  });
});

describe("ShowsBrowsePage ledger", () => {
  it("renders rows as ledger entries, not a surface card of pill filters", async () => {
    const html = await render();
    expect(html).not.toContain("surface-card");
    expect(html).not.toContain("rounded-full");
    expect(html).not.toContain("border-gold");
  });

  it("wraps each row in the #show-<id> jump anchor", async () => {
    const html = await render();
    expect(html).toContain('id="show-42"');
    expect(html).toContain("show-anchor");
  });

  it("shows a nil state with a clear-filters link when no rows match", async () => {
    h.rows = [];
    h.total = 0;
    const html = await render();
    expect(html).toContain("No shows found.");
    expect(html).toContain("clear filters");
    expect(html).toContain('href="/shows"');
  });
});

describe("ShowsBrowsePage count qualifiers", () => {
  it("marks the unfiltered total as the full log, incl. upcoming", async () => {
    // Distinguishes this count from the home hero's played-only "Shows played".
    const html = await render();
    expect(html).toContain("logged");
    expect(html).toContain("incl. upcoming");
  });

  it("drops the upcoming qualifier once a year scopes the list", async () => {
    const html = await render({ year: "2024" });
    expect(html).toContain("in 2024");
    expect(html).not.toContain("incl. upcoming");
  });
});

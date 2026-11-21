import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { TourRow, TourSpan, TourRun } from "@/lib/queries/dimensions";
import type { ShowSummary } from "@/lib/queries/shows";

const h = vi.hoisted(() => ({ experience: "fancy" as "fancy" | "functional" | "minimal", today: "2026-11-19" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/site", () => ({ canonicalUrl: (p: string) => p }));
vi.mock("@/lib/today", () => ({ etToday: () => h.today }));

const FALL = vi.hoisted(() => {
  const show = (showId: number, date: string, venue: string, city: string, state: string, songCount = 0) => ({
    showId, date, order: null, venue, city, state, country: "USA", tour: "Fall Tour 2026", tourId: 45, songCount, hasNotes: false,
  });
  return [
    show(1, "2026-11-03", "The Midland", "Kansas City", "MO", 12),
    show(2, "2026-11-18", "John Paul Jones Arena", "Charlottesville", "VA", 15),
    show(3, "2026-11-19", "Citizens Live at The Wylie", "Pittsburgh", "PA", 2),
    show(4, "2026-11-21", "Blue Cross Arena", "Rochester", "NY"),
  ];
});

vi.mock("@/lib/queries/dimensions", () => ({
  listTours: async () => [
    { tourId: 1, name: "Summer Tour 2024", year: 2024, shows: 5, start: "2024-06-01", end: "2024-08-01" },
    { tourId: 2, name: "Winter Tour 2023", year: 2023, shows: 3, start: "2023-12-01", end: "2023-12-20" },
  ] satisfies TourRow[],
  tourTimeline: async () => ({
    tours: [
      { tourId: 1, name: "Summer Tour 2024", start: "2024-06-01", end: "2024-08-01", shows: 5, dates: ["2024-06-01", "2024-08-01"], upcoming: 0 },
      { tourId: 2, name: "Winter Tour 2023", start: "2023-12-01", end: "2023-12-20", shows: 3, dates: ["2023-12-01", "2023-12-20"], upcoming: 0 },
    ] satisfies TourSpan[],
    untouredShows: 0,
  }),
  tourRuns: async () => ({
    runs: [
      { tourId: 46, name: "Spring Tour 2027", start: "2027-04-09", end: "2027-04-18", shows: 2, upcoming: 2,
        dates: ["2027-04-09", "2027-04-18"], places: ["Alpharetta, GA", "Clearwater, FL"] },
      { tourId: 45, name: "Fall Tour 2026", start: "2026-11-03", end: "2026-11-21", shows: 4, upcoming: 1,
        dates: ["2026-11-03", "2026-11-18", "2026-11-19", "2026-11-21"],
        places: ["Kansas City, MO", "Charlottesville, VA", "Pittsburgh, PA", "Rochester, NY"] },
      { tourId: 20, name: "Summer Tour 2018", start: "2018-06-01", end: "2018-06-20", shows: 2, upcoming: 0,
        dates: ["2018-06-01", "2018-06-20"], places: ["Boston, MA", "Boston, MA"] },
    ] satisfies TourRun[],
    untouredShows: 250,
  }),
}));
vi.mock("@/lib/queries/shows", () => ({
  listShows: async () => ({ rows: FALL, total: FALL.length }),
  getUpcomingShows: async () => [
    FALL[3],
    { showId: 9, date: "2026-12-11", order: null, venue: "Jim Whelan Boardwalk Hall", city: "Atlantic City", state: "NJ",
      country: "USA", tour: null, tourId: 1, songCount: 0, hasNotes: false } satisfies ShowSummary,
  ],
}));

import ToursPage from "./page";

async function render() {
  const el = await ToursPage({});
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
  h.today = "2026-11-19";
});

describe("ToursPage (2.0)", () => {
  it("renders one h1, /tours/<id> rows, year section headings, and no card chrome", async () => {
    h.experience = "functional";
    const html = await render();
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tours/1"');
    expect(html).toContain('href="/tours/2"');
    expect(html).not.toContain("surface-card");
    expect(html).not.toContain("rounded-lg");
    // SectionRule year headings, one per group.
    expect(html).toContain(">2024<");
    expect(html).toContain(">2023<");
  });
});

describe("ToursPage shelved by when (3.0)", () => {
  it("leads with the run on the road: its foil ring, tonight's stickered row, what's next and what just played", async () => {
    const html = await render();
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain("Fall Tour 2026 is on the road");
    expect(html).toContain(">On the road<");
    expect(html).toContain('data-arc="played"');
    expect(html).toContain("of 4 · tonight");
    expect(html).toContain("show 3 is tonight in Pittsburgh");
    expect(html).toMatch(/>Tonight<\/h3>.*Citizens Live at The Wylie.*yeti-label">Tonight</s);
    expect(html).toContain(">Coming up next<");
    expect(html).toContain(">Just played<");
    expect(html).toContain("15 songs");
  });

  it("puts tours that haven't started and one-offs under coming up", async () => {
    const html = await render();
    expect(html).toContain(">Coming up<");
    expect(html).toContain('href="/tours/46"');
    expect(html).toContain(">Not on a tour<");
    expect(html).toContain("Jim Whelan Boardwalk Hall");
    // A tour's own show isn't a one-off.
    expect(html.match(/yeti-tag[^"]*">one-off/g)).toHaveLength(1);
  });

  it("shelves the past in the crate under year heads, each a ring tile, with no calendar chart", async () => {
    const html = await render();
    expect(html).toContain(">The crate<");
    expect(html).toContain('href="/years/2018"');
    expect(html).toContain("tour-tile");
    expect(html).toContain('data-arc="past"');
    expect(html).toContain("Boston");
    expect(html).not.toContain("the touring year");
    expect(html).not.toContain("tour-timeline-label");
  });

  it("with nothing running, says when the band is back out and shelves the last run as just back", async () => {
    h.today = "2026-12-01";
    const html = await render();
    expect(html).not.toContain(">On the road<");
    expect(html).toContain("home until dec 11");
    expect(html).toContain(">Just back<");
    expect(html).toContain("4, in 4 cities");
    expect(html).not.toContain('data-arc="played"');
  });
});

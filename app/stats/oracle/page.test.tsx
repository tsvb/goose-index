import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

type DowRow = { dow: number; dayName: string; totalShows: number; avgJams: number };
type TransitionRow = { sourceName: string; sourceSlug: string | null; targetName: string; targetSlug: string | null; count: number };
type ShelfRow = { songId: number; name: string; slug: string | null; lastPlayedDate: string; totalPlays: number; daysSincePlayed: number };
type VenueRow = { venueId: number; name: string; slug: string | null; totalShows: number; totalPerformances: number; totalJams: number; jamPercentage: number };
type NoteRow = { showId: number; showDate: string; showOrder: number | null; venueName: string | null; coachNotes: string; bandcampUrl: string | null };

const h = vi.hoisted<{
  experience: "fancy" | "functional" | "minimal";
  dow: DowRow[];
  transitions: TransitionRow[];
  shelf: ShelfRow[];
  venues: VenueRow[];
  notes: NoteRow[];
}>(() => ({
  experience: "fancy",
  dow: [
    { dow: 0, dayName: "Sunday", totalShows: 22, avgJams: 3.14 },
    { dow: 1, dayName: "Monday", totalShows: 8, avgJams: 1.20 },
    { dow: 6, dayName: "Saturday", totalShows: 35, avgJams: 2.55 },
  ],
  transitions: [
    { sourceName: "Arrow", sourceSlug: "arrow", targetName: "Tumble", targetSlug: "tumble", count: 12 },
    { sourceName: "Hot Tea", sourceSlug: "hot-tea", targetName: "Madhuvan", targetSlug: "madhuvan", count: 7 },
  ],
  shelf: [
    { songId: 1, name: "Elmeg the Wise", slug: "elmeg-the-wise", lastPlayedDate: "2023-11-04", totalPlays: 42, daysSincePlayed: 981 },
    { songId: 2, name: "Wysteria Lane", slug: null, lastPlayedDate: "2024-01-19", totalPlays: 11, daysSincePlayed: 906 },
  ],
  venues: [
    { venueId: 9, name: "The Capitol Theatre", slug: "capitol-theatre", totalShows: 8, totalPerformances: 120, totalJams: 40, jamPercentage: 33.3 },
  ],
  notes: [
    { showId: 100, showDate: "2026-07-04", showOrder: 1, venueName: "SPAC", coachNotes: "Big night. Hunter → Arrow.", bandcampUrl: "https://goosetheband.bandcamp.com/album/2026-07-04-spac" },
    { showId: 101, showDate: "2026-06-20", showOrder: null, venueName: null, coachNotes: "Sit-in with the horns.", bandcampUrl: null },
  ],
}));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/discoveries", () => ({
  SHELF_MIN_PLAYS: 6,
  DEEPEST_MIN_SHOWS: 3,
  TRANSITIONS_TOP_N: 15,
  dayOfWeekJams: async () => h.dow,
  topTransitions: async () => h.transitions,
  originalsOnTheShelf: async () => h.shelf,
  deepestVenues: async () => h.venues,
  coachsNotes: async () => h.notes,
}));
vi.mock("@/lib/queries/songs", () => ({
  OVERDUE_MIN_PLAYS: 5,
}));

import OraclePage from "./page";

async function render() {
  return renderToStaticMarkup(await OraclePage());
}

beforeEach(() => {
  h.experience = "fancy";
});

describe("Oracle page (fancy)", () => {
  it("renders each of the five sections with its heading and data", async () => {
    const html = await render();
    expect(html).toContain("Never miss a Sunday show?");
    expect(html).toContain("Flow-state matrix");
    expect(html).toContain("The shelf");
    expect(html).toContain("Deepest venues");
    expect(html).toMatch(/From the coach(&#x27;|')s desk/);
    // one data point from each section
    expect(html).toContain("Arrow");
    expect(html).toContain("Tumble");
    expect(html).toContain("Elmeg the Wise");
    expect(html).toContain("The Capitol Theatre");
    expect(html).toContain("Big night");
    // positive path: a valid bandcamp URL surfaces the Listen link on the J-card
    expect(html).toContain("Listen ↗");
    expect(html).toContain("goosetheband.bandcamp.com/album/2026-07-04-spac");
  });

  it("renders the StatsShell chrome (breadcrumb, switcher, methodology)", async () => {
    const html = await render();
    expect(html).toContain('href="/stats"');
    expect(html).toContain('href="/stats/most-played"'); // switcher includes siblings
    expect(html).toContain('aria-current="page"'); // oracle is active
    expect(html).toContain("Flow-state segues"); // methodology footnote
  });

  it("formats dates timezone-safely (never off-by-one)", async () => {
    const html = await render();
    // formatShortDate("2026-07-04") -> "Jul 4, 2026", not "Jul 3, 2026"
    expect(html).toContain("Jul 4, 2026");
    expect(html).toContain("Nov 4, 2023"); // shelf: last played
  });

  it("only linkifies songs that have a slug", async () => {
    const html = await render();
    expect(html).toContain('href="/songs/elmeg-the-wise"');
    // "Wysteria Lane" has null slug — no /songs/ link for it
    const withoutSlug = html.match(/Wysteria Lane/);
    expect(withoutSlug).not.toBeNull();
    expect(html).not.toContain('href="/songs/null"');
  });

  it("blocks non-bandcamp URLs from the Listen affordance", async () => {
    h.notes = [
      { showId: 200, showDate: "2026-05-01", showOrder: null, venueName: null, coachNotes: "x", bandcampUrl: "https://evil.example.com/steal" },
    ];
    const html = await render();
    expect(html).not.toContain("evil.example.com");
    expect(html).not.toContain("Listen ↗");
  });
});

describe("Oracle page (minimal)", () => {
  beforeEach(() => {
    h.experience = "minimal";
  });

  it("renders as a plain document with tables", async () => {
    const html = await render();
    expect(html).toContain("doc-crumb");
    expect(html).toContain("doc-table");
    expect(html).toContain(">Day</th>");
    expect(html).toContain(">Song</th>");
    expect(html).toContain(">Venue</th>");
    // switcher renders as a text list with the active title bolded
    expect(html).toContain("<strong>Oracle</strong>");
  });

  it("skips the coach's notes section when there are none", async () => {
    h.notes = [];
    const html = await render();
    // React escapes apostrophes to &#x27; in server-rendered HTML — match both forms.
    expect(html).not.toMatch(/Coach(&#x27;|')s notes/);
  });
});

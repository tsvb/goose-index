import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SongSearchRow } from "@/lib/queries/songs";

const h = vi.hoisted(() => ({
  experience: "fancy" as "fancy" | "functional" | "minimal",
  songs: [] as Record<string, unknown>[],
  showRows: [] as Record<string, unknown>[],
  showTotal: 0,
  venueRows: [] as Record<string, unknown>[],
  venueTotal: 0,
  tourRows: [] as Record<string, unknown>[],
  tourTotal: 0,
  years: [] as { year: number; shows: number; songs: number }[],
  yearsCalls: 0,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh() {}, push() {} }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/songs", () => ({
  // Honors the limit like the real query; total counts every match.
  searchSongs: async (_q: string, limit = 12) => ({ rows: h.songs.slice(0, limit), total: h.songs.length }),
}));
vi.mock("@/lib/queries/shows", () => ({
  searchShows: async () => ({ rows: h.showRows, total: h.showTotal }),
}));
vi.mock("@/lib/queries/dimensions", () => ({
  searchVenues: async () => ({ rows: h.venueRows, total: h.venueTotal }),
  searchTours: async () => ({ rows: h.tourRows, total: h.tourTotal }),
  listYears: async () => {
    h.yearsCalls++;
    return h.years;
  },
}));

import SearchPage from "./page";

async function render(params: Record<string, string> = {}) {
  const el = await SearchPage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(el);
}

function song(i: number, over: Partial<SongSearchRow> = {}): Record<string, unknown> {
  return { songId: i, name: `Song ${i}`, slug: `song-${i}`, timesPlayed: 100 - i, lastPlayedDate: "2026-06-12", ...over };
}

function show(i: number): Record<string, unknown> {
  return {
    showId: i, date: "2024-06-15", order: 1, venue: "The Cap", city: "Port Chester",
    state: "NY", country: "USA", tour: null, tourId: null, songCount: 12, hasNotes: false,
  };
}

beforeEach(() => {
  h.experience = "fancy";
  h.songs = [];
  h.showRows = [];
  h.showTotal = 0;
  h.venueRows = [];
  h.venueTotal = 0;
  h.tourRows = [];
  h.tourTotal = 0;
  h.years = [];
  h.yearsCalls = 0;
});

describe("SearchPage songs group", () => {
  it("renders songs first with link, play count, and last-played date", async () => {
    h.songs = [song(1, { name: "Jive II", slug: "jive-ii", timesPlayed: 284, lastPlayedDate: "2026-06-12" })];
    h.showRows = [show(9)];
    h.showTotal = 1;
    const html = await render({ q: "jive" });
    expect(html).toContain('href="/songs/jive-ii"');
    expect(html).toContain("Jive II");
    expect(html).toContain("284 plays");
    expect(html).toContain("Last played Jun 12, 2026");
    expect(html.indexOf("Songs · ")).toBeLessThan(html.indexOf("Shows · "));
  });

  it("falls back to the songId href when slug is null and words a never-played song honestly", async () => {
    h.songs = [song(456, { slug: null, timesPlayed: 0, lastPlayedDate: null })];
    const html = await render({ q: "song" });
    expect(html).toContain('href="/songs/456"');
    expect(html).toContain("0 plays");
    expect(html).toContain("Not yet played live");
  });

  it("shows the full match total with a See-all link when truncated", async () => {
    h.songs = Array.from({ length: 13 }, (_, i) => song(i + 1));
    const html = await render({ q: "song" });
    expect(html).toContain("Songs · 13");
    expect(html).toContain('href="/songs?q=song"');
    expect(html).toContain("See all");
    expect(html).not.toContain("Song 13"); // only the 12 on-page rows render
  });

  it("omits the See-all link when every match is on the page", async () => {
    h.songs = [song(1), song(2)];
    const html = await render({ q: "song" });
    expect(html).toContain("Songs · 2");
    expect(html).not.toContain("/songs?q=");
  });
});

describe("SearchPage group counts", () => {
  it("puts the full match total in the shows header and flags truncation", async () => {
    h.showRows = Array.from({ length: 24 }, (_, i) => show(i + 1));
    h.showTotal = 52;
    const html = await render({ q: "red rocks" });
    expect(html).toContain("Shows · 52");
    expect(html).toContain("Showing the 24 most recent of 52 matching shows");
  });

  it("puts venue and tour totals in their headers", async () => {
    h.venueRows = [{ venueId: 7, name: "Red Rocks", city: "Morrison", state: "CO", country: "USA", capacity: null, shows: 9, first: null, last: null }];
    h.venueTotal = 14;
    h.tourRows = [{ tourId: 3, name: "Summer Tour", year: 2024, shows: 5, start: "2024-06-01", end: "2024-08-01" }];
    h.tourTotal = 9;
    const html = await render({ q: "red rocks" });
    expect(html).toContain("Venues · 14");
    expect(html).toContain("Showing 1 of 14 matching venues");
    expect(html).toContain("Tours · 9");
    expect(html).toContain("Showing 1 of 9 matching tours");
  });
});

describe("SearchPage year shortcut", () => {
  it("pins a /years link above the shows for a bare year with shows", async () => {
    h.showRows = [show(1)];
    h.showTotal = 1;
    h.years = [{ year: 2024, shows: 40, songs: 400 }];
    const html = await render({ q: "2024" });
    expect(html).toContain('href="/years/2024"');
    expect(html).toContain("Year 2024");
    expect(html.indexOf("/years/2024")).toBeLessThan(html.indexOf("Shows · "));
  });

  it("skips the shortcut for a year Goose never played", async () => {
    h.showRows = [show(1)];
    h.showTotal = 1;
    h.years = [{ year: 2024, shows: 40, songs: 400 }];
    const html = await render({ q: "1999" });
    expect(html).not.toContain("/years/1999");
  });

  it("never consults the year list for non-year queries", async () => {
    h.showRows = [show(1)];
    h.showTotal = 1;
    await render({ q: "red rocks" });
    expect(h.yearsCalls).toBe(0);
  });
});

describe("SearchPage empty and no-results states", () => {
  it("mentions songs in the empty-state suggestion copy", async () => {
    const html = await render();
    expect(html).toContain("Hot Tea");
    expect(html).toContain("2022-06-24");
  });

  it("recovers from no results with a song-catalog search and browse links", async () => {
    const html = await render({ q: "zzz nothing" });
    expect(html).toContain("No results for");
    expect(html).toContain("Try a song like");
    expect(html).toContain('href="/songs?q=zzz%20nothing"');
    expect(html).toContain('href="/shows"');
    expect(html).toContain('href="/songs"');
  });
});

describe("SearchPage minimal mode", () => {
  beforeEach(() => {
    h.experience = "minimal";
  });

  it("renders a working GET form in the empty state, with the address-bar tip demoted", async () => {
    const html = await render();
    expect(html).toContain('action="/search"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="q"');
    expect(html).toContain(">Go</button>");
    expect(html).toContain("/search?q=red+rocks"); // tip survives as secondary copy
    expect(html).toContain("song"); // suggestion copy mentions songs
  });

  it("seeds the form and renders a counted songs section on results", async () => {
    h.songs = Array.from({ length: 13 }, (_, i) => song(i + 1));
    const html = await render({ q: "song" });
    expect(html).toContain('action="/search"');
    expect(html).toContain('value="song"');
    expect(html).toContain("Songs · 13");
    expect(html).toContain('href="/songs/song-1"');
    expect(html).toContain("last played 2026-06-12");
    expect(html).toContain('href="/songs?q=song"'); // truncated → See all
  });

  it("shows totals, the year link, and truncation notes in results", async () => {
    h.showRows = [show(1)];
    h.showTotal = 3;
    h.years = [{ year: 2024, shows: 40, songs: 400 }];
    const html = await render({ q: "2024" });
    expect(html).toContain("Shows · 3");
    expect(html).toContain("Showing the 1 most recent of 3.");
    expect(html).toContain('href="/years/2024"');
  });

  it("offers recovery links on no results", async () => {
    const html = await render({ q: "zzz" });
    expect(html).toContain("No results for");
    expect(html).toContain('href="/songs?q=zzz"');
    expect(html).toContain('href="/shows"');
    expect(html).toContain('href="/songs"');
    expect(html).toContain('action="/search"'); // the form stays available
  });
});

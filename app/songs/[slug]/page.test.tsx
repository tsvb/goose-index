import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ResolvingMetadata } from "next";
import type { SongStat, SongPerf } from "@/lib/queries/songs";

const h = vi.hoisted(() => ({
  experience: "fancy",
  song: null as Record<string, unknown> | null,
  perfs: [] as Record<string, unknown>[],
  perfsQueried: false,
}));

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/songs", () => ({
  getSongBySlug: async () => h.song as unknown as SongStat | null,
  getSongPerformances: async () => {
    h.perfsQueried = true;
    return h.perfs as unknown as SongPerf[];
  },
  getSongAlbums: async () => [],
}));
// Chart/table children are exercised by their own colocated tests; stubs keep
// this test on the played/never-played branch.
vi.mock("@/app/_components/song", () => ({
  FactRibbon: () => <div data-stub="ribbon" />,
  AppearsOn: () => null,
  PlaysPerYearChart: () => null,
  SetPlacementBars: () => null,
  GapSparkline: () => null,
  PerformanceTable: () => <table data-stub="perf-table" />,
}));

import SongPage, { generateMetadata } from "./page";

function song(overrides: Partial<SongStat> = {}): SongStat {
  return {
    songId: 1, name: "Creatures", slug: "creatures", isOriginal: true, originalArtist: null,
    timesPlayed: 0, debutDate: null, debutShowId: null, debutOrder: null,
    lastPlayedDate: null, lastShowId: null, lastOrder: null,
    currentGap: null, longestGap: null, avgGap: null, rotationPct: 0, longestSeconds: null,
    playsPerYear: [], setPlacement: { set1: 0, set2: 0, encore: 0, opener: 0, jammed: 0 },
    longestVersions: [], topVenues: [], ...overrides,
  };
}

async function render(slug = "creatures") {
  const el = await SongPage({ params: Promise.resolve({ slug }) });
  return renderToStaticMarkup(el);
}

async function meta(slug = "creatures") {
  return generateMetadata(
    { params: Promise.resolve({ slug }) },
    Promise.resolve({}) as unknown as ResolvingMetadata,
  );
}

beforeEach(() => {
  h.experience = "fancy";
  h.song = song();
  h.perfs = [];
  h.perfsQueried = false;
});

describe("SongPage for a never-played song", () => {
  it("fancy replaces ribbon/charts/table with the songbook empty state", async () => {
    const html = await render();
    expect(html).toContain("In the songbook, but never yet played live.");
    expect(html).toContain("Creatures");
    expect(html).not.toContain("data-stub"); // no ribbon, no performance table
    expect(html).not.toContain("Every performance");
    expect(html).toContain('href="/songs"');
    expect(html).toContain('href="/stats/debuts"');
  });
  it("skips the performances query entirely", async () => {
    await render();
    expect(h.perfsQueried).toBe(false);
  });
  it("minimal gets the same message as plain prose", async () => {
    h.experience = "minimal";
    const html = await render();
    expect(html).toContain("In the songbook, but never yet played live");
    expect(html).toContain("<h1");
    expect(html).not.toContain("doc-table");
  });
  it("functional shares the fancy body", async () => {
    h.experience = "functional";
    const html = await render();
    expect(html).toContain("In the songbook, but never yet played live.");
  });
  it("drops the dashed empty-state box for a nil entry", async () => {
    const html = await render();
    expect(html).not.toContain("border-dashed");
    expect(html).not.toContain("rounded-lg border border-dashed");
  });
  it("keeps both never-played links, lowercase", async () => {
    const html = await render();
    expect(html).toContain('href="/songs"');
    expect(html).toContain("browse the catalog");
    expect(html).toContain('href="/stats/debuts"');
    expect(html).toContain("recent debuts");
  });
});

describe("SongPage for a played song", () => {
  it("keeps the ribbon and performance table", async () => {
    h.song = song({ timesPlayed: 2, debutDate: "2021-06-01", lastPlayedDate: "2024-04-20" });
    h.perfs = [];
    const html = await render();
    expect(html).toContain('data-stub="ribbon"');
    expect(html).toContain('data-stub="perf-table"');
    expect(html).not.toContain("never yet played live");
  });
  it("steps h1 → h2 with no skipped level (sections are h2, not h3)", async () => {
    h.song = song({ timesPlayed: 2, debutDate: "2021-06-01", lastPlayedDate: "2024-04-20" });
    h.perfs = [];
    const html = await render();
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain("<h2");
    expect(html).not.toContain("<h3");
  });
});

describe("SongPage furniture — breadcrumb, tag, section rules", () => {
  beforeEach(() => {
    h.song = song({
      timesPlayed: 2, debutDate: "2021-06-01", lastPlayedDate: "2024-04-20",
      longestVersions: [{ date: "2024-01-01", showId: 1, order: null, venue: "The Cap", trackTime: "12:34", seconds: 754 }],
      topVenues: [{ venueId: 9, name: "The Cap", count: 3 }],
    });
    h.perfs = [{
      uniqueId: "1", date: "2024-01-01", showId: 1, order: null, venue: "The Cap", city: null, state: null,
      setLabel: "Set 1", position: 1, trackTime: "12:34", seconds: 754, gap: 1, isJam: false, isJamchart: false, isDustedOff: false,
    }];
  });

  it("colors the crumb links spruce, not the unstyled default", async () => {
    const html = await render();
    const idx = html.indexOf(">Songs<");
    const tag = html.slice(html.lastIndexOf("<a", idx), idx);
    expect(tag).toContain("text-spruce");
    expect(tag).toContain('href="/songs"');
  });

  it("renders the tag as plain lowercase mono text, not a bordered pill", async () => {
    h.song = song({ timesPlayed: 2, isOriginal: false, originalArtist: "Trad.", debutDate: "2021-06-01" });
    const html = await render();
    expect(html).not.toContain("rounded-full border border-line");
    expect(html).toMatch(/<span class="[^"]*\blowercase\b[^"]*">Cover · Trad\.<\/span>/);
  });

  it("renders section headings through SectionRule, lowercase, ruled", async () => {
    const html = await render();
    expect(html).toContain(">plays per year<");
    expect(html).toContain(">set placement<");
    expect(html).toContain(">gaps &amp; returns<");
    expect(html).toContain(">longest versions<");
    expect(html).toContain(">top venues<");
    expect(html).toMatch(/>every performance/);
    // SectionRule draws a PenRule svg under each heading.
    expect((html.match(/<svg aria-hidden="true" viewBox="0 0 400 6"/g) ?? []).length).toBeGreaterThanOrEqual(6);
  });

  it("drops the old plain h2 furniture classes", async () => {
    const html = await render();
    expect(html).not.toContain('class="mb-2 font-display text-base text-ink"');
  });
});

describe("SongPage metadata description grammar", () => {
  it("says a never-played song is in the book, not 'played 0 times'", async () => {
    h.song = song({ timesPlayed: 0 });
    const m = await meta();
    expect(m.description).toContain("never yet played live");
    expect(m.description).not.toContain("0 time");
  });

  it("uses the singular 'time' for a one-off", async () => {
    h.song = song({ timesPlayed: 1, debutDate: "2023-05-01" });
    const m = await meta();
    expect(m.description).toBe("Goose has played Creatures 1 time since 2023-05-01.");
    expect(m.description).not.toContain("1 times");
  });

  it("uses plural 'times' with the debut date when known", async () => {
    h.song = song({ timesPlayed: 42, debutDate: "2019-01-30" });
    const m = await meta();
    expect(m.description).toBe("Goose has played Creatures 42 times since 2019-01-30.");
  });

  it("drops the 'since' clause entirely when the debut is unknown", async () => {
    h.song = song({ timesPlayed: 42, debutDate: null });
    const m = await meta();
    expect(m.description).toBe("Goose has played Creatures 42 times.");
    expect(m.description).not.toContain("since");
    expect(m.description).not.toContain("?");
  });
});

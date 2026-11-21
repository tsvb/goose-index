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
vi.mock("@/lib/queries/dimensions", () => ({
  careerYears: async () => [
    { year: 2024, shows: 71, documented: 71, performances: 0, uniqueSongs: 0, debuts: 0, partial: false },
    { year: 2026, shows: 76, documented: 75, performances: 0, uniqueSongs: 0, debuts: 0, partial: true },
  ],
}));
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

describe("SongPage for a played song (2.0)", () => {
  beforeEach(() => {
    h.experience = "functional";
  });
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

describe("SongPage performance pagination (2.0 and 3.0)", () => {
  const perf = (i: number) => ({
    uniqueId: `p${i}`, date: `2024-01-${String((i % 28) + 1).padStart(2, "0")}`, showId: i, order: 1,
    venue: "V", city: "C", state: "S", setLabel: "Set I", position: 1, trackTime: null, seconds: null,
    gap: 1, isJamchart: false, isDustedOff: false,
  });
  it("shows no pager when the table fits one page", async () => {
    h.song = song({ timesPlayed: 3 });
    h.perfs = [perf(1), perf(2), perf(3)];
    const html = await render();
    expect(html).not.toContain("page 1 of");
  });
  it.each(["functional", "fancy"])("pages at 50 and links newer/older (%s)", async (edition) => {
    h.experience = edition;
    h.song = song({ timesPlayed: 120 });
    h.perfs = Array.from({ length: 120 }, (_, i) => perf(i));
    const el = await SongPage({ params: Promise.resolve({ slug: "creatures", page: "2" }) });
    const html = renderToStaticMarkup(el);
    expect(html).toContain("page 2 of 3");
    expect(html).toContain('href="/songs/creatures"'); // newer → page 1 is the bare URL
    expect(html).toContain('href="/songs/creatures?page=3"');
  });
  it("clamps an out-of-range page instead of rendering an empty table", async () => {
    h.song = song({ timesPlayed: 60 });
    h.perfs = Array.from({ length: 60 }, (_, i) => perf(i));
    const el = await SongPage({ params: Promise.resolve({ slug: "creatures", page: "9" }) });
    expect(renderToStaticMarkup(el)).toContain("page 2 of 2");
  });
});

describe("SongPage furniture — breadcrumb, tag, section rules (2.0)", () => {
  beforeEach(() => {
    h.experience = "functional";
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

  it("renders the tag as plain mono text, not a bordered pill", async () => {
    h.song = song({ timesPlayed: 2, isOriginal: false, originalArtist: "Trad.", debutDate: "2021-06-01" });
    const html = await render();
    expect(html).not.toContain("rounded-full border border-line");
    expect(html).toContain('<span class="font-mono text-[0.7rem] text-faint">cover · Trad.</span>');
  });

  it("folds only the chrome word 'cover' — the authored artist name keeps its case", async () => {
    // A blanket `lowercase` class used to fold the whole tag, including the
    // artist name; only the literal "cover"/"original" word should fold now.
    h.song = song({ timesPlayed: 2, isOriginal: false, originalArtist: "The Beatles", debutDate: "2021-06-01" });
    const html = await render();
    expect(html).toContain("cover · The Beatles");
    expect(html).not.toContain("cover · the beatles");
    expect(html).not.toMatch(/class="[^"]*\blowercase\b[^"]*">cover/);
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

  it("longest-version durations wear ink, not the gold alias — durations are content", async () => {
    const html = await render();
    const idx = html.indexOf("12:34");
    const tag = html.slice(html.lastIndexOf("<span", idx), idx);
    expect(tag).toContain("text-ink");
    expect(tag).not.toContain("text-gold");
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

describe("SongPage metadata robots", () => {
  it("keeps a never-played song out of the index, but lets crawlers follow its links", async () => {
    h.song = song({ timesPlayed: 0 });
    const m = await meta();
    expect(m.robots).toEqual({ index: false, follow: true });
  });

  it("leaves a played song indexable", async () => {
    h.song = song({ timesPlayed: 1, debutDate: "2023-05-01" });
    const m = await meta();
    expect(m.robots).toBeUndefined();
  });
});

describe("SongPage as Yeti reads a track (3.0)", () => {
  const perf = (showId: number, date: string, gap: number | null, extra: Record<string, unknown> = {}) => ({
    uniqueId: `p${showId}`, date, showId, order: null, venue: "The Cap", city: "C", state: "S", setLabel: "Set I",
    position: 1, trackTime: "9:11", seconds: 551, gap, isJamchart: false, isDustedOff: false, ...extra,
  });
  beforeEach(() => {
    h.experience = "fancy";
    h.song = song({
      name: "Lead the Way", timesPlayed: 3, debutDate: "2024-01-01", lastPlayedDate: "2026-05-07", lastOrder: null,
      currentGap: 61, longestGap: 51, avgGap: 6.1, rotationPct: 13,
      playsPerYear: [{ year: 2024, count: 2 }, { year: 2025, count: 0 }, { year: 2026, count: 1 }],
      setPlacement: { set1: 92, set2: 6, encore: 2, opener: 30, jammed: 4 },
      longestVersions: [{ date: "2024-01-01", showId: 1, order: null, venue: "The Cap", trackTime: "14:56", seconds: 896 }],
      topVenues: [{ venueId: 9, name: "The Cap", count: 3 }],
    });
    h.perfs = [
      perf(3, "2026-05-07", 51, { isDustedOff: true, trackTime: null }),
      perf(2, "2024-01-05", 2, { isJamchart: true }),
      perf(1, "2024-01-01", null),
    ];
  });

  it("leads with the gap ring and says when the song is gone longer than ever", async () => {
    const html = await render();
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('data-role="record"');
    expect(html).toContain('data-role="gap"');
    expect(html).toContain("Gone 61 shows, longer than ever.");
    expect(html).toContain("longest it&#x27;s been gone");
    expect(html).not.toContain('data-stub="ribbon"');
  });

  it("puts the numbers on one says-so-on-the-box list", async () => {
    const html = await render();
    expect(html).toContain(">Says so on the box<");
    expect(html).toMatch(/>rotation<\/dt><dd[^>]*>13% of shows since its debut</);
    expect(html).toMatch(/>longest gap<\/dt><dd[^>]*>51 shows</);
  });

  it("draws the whole run with the gap still running in foil and returns marked", async () => {
    const html = await render();
    expect(html.match(/data-mark="played"/g)).toHaveLength(2);
    expect(html.match(/data-mark="returned"/g)).toHaveLength(1);
    expect(html).toContain('data-role="now"');
    expect(html).toContain("now · 61 since");
  });

  it("reads its years as shows out of the year's setlists, and its placement as one capsule", async () => {
    const html = await render();
    expect(html).toMatch(/>2024<\/span>.*?>2<span[^>]*> of (<!-- -->)?71<\/span>/s);
    expect(html).toContain(">2025<");
    expect(html).toContain('data-seg="set 1"');
    expect(html).toMatch(/opens (<!-- -->)?30(<!-- -->)?% of the time/);
  });

  it("lists every performance as queue rows: dusted-off tagged, jam marked", async () => {
    const html = await render();
    expect(html).toMatch(/dusted off · (<!-- -->)?51/);
    expect(html).toContain("set i · after 2");
    expect(html).toContain('href="/shows/2026-05-07"');
    expect(html).not.toContain('data-stub="perf-table"');
  });

  it("tags a cover with its artist, as the band credits it", async () => {
    h.song = { ...h.song!, isOriginal: false, originalArtist: "Kylie Minogue" };
    expect(await render()).toContain("cover · Kylie Minogue");
  });
});

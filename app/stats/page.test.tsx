import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

type Row = {
  songId: number; name: string; slug: string; isOriginal: boolean;
  timesPlayed: number; rotationPct: number; currentGap: number | null;
  lastPlayedDate: string | null; debutYear: number | null; playsPerYear: number[];
  album: null;
};

const h = vi.hoisted(() => {
  const song = (o: Partial<Row> & { songId: number; name: string; slug: string; timesPlayed: number }): Row => ({
    isOriginal: true, rotationPct: 10, currentGap: 0, lastPlayedDate: "2026-06-12", debutYear: 2017, playsPerYear: [1, 2], album: null,
    ...o,
  });
  const fresh = () => ({
    highlights: {
      mostPlayed: { name: "Jive II", slug: "jive-ii", plays: 284 } as { name: string; slug: string; plays: number } | null,
      raritiesCount: 37,
      mostOverdue: { name: "Elmeg the Wise", slug: "elmeg-the-wise", gap: 45 } as { name: string; slug: string; gap: number } | null,
      latestDebut: { name: "New One", slug: "new-one", date: "2026-06-30" } as { name: string; slug: string; date: string } | null,
      topOpener: { name: "Madhuvan", slug: "madhuvan", count: 32 } as { name: string; slug: string; count: number } | null,
    },
    scope: { showsPlayed: 839, upcoming: 3, songs: 368, songsInCatalog: 900, venues: 464, performances: 7725, firstDate: "2014-09-27" as string | null, lastPlayedDate: "2026-09-02" as string | null },
    // 12 songs, 817 plays: the top two (484) cross half, so the reading is "2".
    // Five songs sit at 3 plays or fewer.
    profile: { plays: [284, 200, 150, 100, 50, 20, 5, 3, 2, 1, 1, 1], shows: 800 },
    top: [song({ songId: 1, name: "Jive II", slug: "jive-ii", timesPlayed: 284 }), song({ songId: 2, name: "Madhuvan", slug: "madhuvan", timesPlayed: 200 })],
    rare: [
      song({ songId: 10, name: "Elmeg the Wise", slug: "elmeg-the-wise", timesPlayed: 3, lastPlayedDate: "2026-03-01" }),
      song({ songId: 11, name: "Twice Cover", slug: "twice-cover", timesPlayed: 2, isOriginal: false, lastPlayedDate: "2026-05-01" }),
      song({ songId: 12, name: "One Night Only", slug: "one-night-only", timesPlayed: 1, lastPlayedDate: "2026-08-21" }),
    ],
    gaps: [song({ songId: 20, name: "Up On Cripple Creek", slug: "up-on-cripple-creek", timesPlayed: 6, isOriginal: false, currentGap: 616 })],
    byYear: [{ year: 2024, count: 12 }, { year: 2025, count: 9 }, { year: 2026, count: 4 }],
    recent: [{ slug: "new-one", name: "New One", date: "2026-06-30", venue: "The Cap" }],
    buckets: [
      { key: "show-opener", label: "Show openers", rows: [{ slug: "madhuvan", name: "Madhuvan", count: 32 }] },
      { key: "encore", label: "Encores", rows: [] as { slug: string; name: string; count: number }[] },
    ],
    dow: [
      { dow: 1, dayName: "Monday", totalShows: 25, avgJams: 1.64 },
      { dow: 6, dayName: "Saturday", totalShows: 221, avgJams: 0.8 },
    ],
  });
  return { experience: "fancy" as "fancy" | "functional" | "minimal", fresh, d: fresh() };
});

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/songs", () => ({
  OVERDUE_MIN_PLAYS: 5, // cuts.ts folds this into the Most Overdue methodology note
  RARITY_MAX_PLAYS: 3,
  statsHubHighlights: async () => h.d.highlights,
  catalogProfile: async () => h.d.profile,
  mostPlayed: async () => h.d.top,
  rarities: async () => h.d.rare,
  currentGaps: async () => h.d.gaps,
  debutsByYear: async () => h.d.byYear,
  recentDebuts: async () => h.d.recent,
  setStats: async () => h.d.buckets,
}));
vi.mock("@/lib/queries/stats", () => ({ getOverviewStats: async () => h.d.scope }));
vi.mock("@/lib/queries/discoveries", () => ({ dayOfWeekJams: async () => h.d.dow }));
vi.mock("@/lib/today", () => ({ etYear: () => 2026 }));

import StatsHub from "./page";

async function render() {
  return renderToStaticMarkup(await StatsHub());
}

beforeEach(() => {
  h.experience = "fancy";
  h.d = h.fresh();
});

describe("StatsHub (fancy/functional)", () => {
  it("opens with the catalog's scope, computed from the overview", async () => {
    const html = await render();
    expect(html).toContain("839 shows · 7,725 songs played · 368 unique songs · since 2014");
  });

  it("draws the catalog profile with one hand reading and the two cuts bracketed on", async () => {
    const html = await render();
    expect(html.match(/stroke="var\(--hand\)"/g)).toHaveLength(1);
    expect(html).toContain(">2</b> songs are half of all plays");
    expect(html).toContain("most played · top 12");
    expect(html).toContain("3 plays or fewer · 5 songs");
    expect(html).toContain("12 played songs, ranked by plays");
  });

  it("reads each cut's live lines", async () => {
    const html = await render();
    // most played: name, count, and a steel bar per row
    expect(html).toContain("Jive II");
    expect(html).toContain(">284<");
    expect(html.match(/bg-steel/g)?.length).toBeGreaterThanOrEqual(2);
    // rarities: the count that is the cut, its split, and the most recent return (never a one-play song)
    expect(html).toContain(">3</b> songs qualify");
    expect(html).toContain("2 originals, 1 cover");
    expect(html).toContain("Twice Cover");
    expect(html).toContain("last May 1, 2026");
    expect(html).not.toContain("One Night Only");
    // overdue: ring in ember + written count
    expect(html).toContain("Up On Cripple Creek");
    expect(html).toContain('stroke="var(--ember)"');
    expect(html).toContain(">616</span>");
    // debuts: the running year is dashed and named
    expect(html).toContain("New One");
    expect(html).toContain("Jun 30, 2026 · The Cap");
    expect(html).toContain("4 so far in 2026");
    expect(html).toContain("1px dashed var(--steel)");
    // set stats: the leader per bucket, nil for an empty one
    expect(html).toContain("Show openers");
    expect(html).toContain("Madhuvan");
    expect(html).toContain(">32 <");
    // oracle: the dial's reading with its evidence
    expect(html).toContain("Monday");
    expect(html).toContain("1.64 jams a show, +0.42 on the week"); // mean of 1.64 and 0.8 = 1.22
    expect(html).toContain("but on 25 shows, against 221 on a Saturday");
  });

  it("links every cut, twice: by name and by how much is there", async () => {
    const html = await render();
    for (const slug of ["most-played", "rarities", "current-gaps", "debuts", "set-stats", "oracle"]) {
      const hits = html.match(new RegExp(`href="/stats/${slug}"`, "g")) ?? [];
      expect(hits.length, slug).toBeGreaterThanOrEqual(2);
    }
    expect(html).toContain("the top 100 →");
    expect(html).toContain("all 3 →");
  });

  it("names every hub number from the data, never a literal", async () => {
    // A different catalog must move every headline the hub prints.
    h.d.profile = { plays: [10, 10, 10, 10], shows: 40 };
    h.d.scope = { ...h.d.scope, showsPlayed: 40, performances: 40, songs: 4, firstDate: "2019-01-01" };
    const html = await render();
    expect(html).toContain("40 shows · 40 songs played · 4 unique songs · since 2019");
    expect(html).toContain(">2</b> songs are half of all plays");
    expect(html).toContain("most played · top 4");
    expect(html).not.toContain("plays or fewer"); // no tail: nothing at 3 plays or fewer
  });

  it("survives an empty catalog: nil lines, no figure, every cut still linked", async () => {
    h.d.profile = { plays: [], shows: 0 };
    h.d.top = [];
    h.d.rare = [];
    h.d.gaps = [];
    h.d.byYear = [];
    h.d.recent = [];
    h.d.buckets = [];
    h.d.dow = [];
    h.d.scope = { ...h.d.scope, firstDate: null };
    const html = await render();
    expect(html).not.toContain("half of all plays");
    expect(html).not.toContain("since ");
    expect(html).toContain("No plays logged yet —");
    expect(html).toContain("No jam charts read yet.");
    for (const slug of ["most-played", "rarities", "current-gaps", "debuts", "set-stats", "oracle"])
      expect(html).toContain(`href="/stats/${slug}"`);
  });

  it("functional shares the fancy hub markup — no cards", async () => {
    h.experience = "functional";
    const functionalHtml = await render();
    h.experience = "fancy";
    const fancyHtml = await render();
    expect(functionalHtml).toBe(fancyHtml);
    expect(functionalHtml).not.toContain("surface-card");
  });
});

describe("StatsHub minimal", () => {
  it("renders the five headlines as a MetaTable with song links", async () => {
    h.experience = "minimal";
    const html = await render();
    expect(html).toContain("doc-meta");
    expect(html).toContain(">Most Played</td>");
    expect(html).toContain('href="/songs/jive-ii"');
    expect(html).toContain("284 plays");
    expect(html).toContain("37 songs qualify");
    expect(html).toContain("45 shows since last played");
    expect(html).toContain("debuted 2026-06-30");
    expect(html).toContain("opened 32 shows");
    expect(html).toContain('href="/stats/set-stats"'); // cut links stay
    expect(html).not.toContain("half of all plays"); // the document edition draws no charts
  });

  it("falls back to an em dash for empty cuts", async () => {
    h.experience = "minimal";
    h.d.highlights = { mostPlayed: null, raritiesCount: 0, mostOverdue: null, latestDebut: null, topOpener: null };
    const html = await render();
    expect(html).toContain("—");
    expect(html).toContain("0 songs qualify");
  });
});

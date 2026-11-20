import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({ experience: "fancy" as "fancy" | "functional" | "minimal" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/songs", () => ({
  OVERDUE_MIN_PLAYS: 5, // cuts.ts folds this into the Most Overdue methodology note
  mostPlayed: async () => [row],
  rarities: async () => [row],
  currentGaps: async () => [row],
  debutsByYear: async () => [{ year: 2020, count: 3 }, { year: 2021, count: 0 }, { year: 2022, count: 1 }],
  recentDebuts: async () => [{ slug: "hot-tea", name: "Hot Tea", date: "2020-01-01", venue: "The Cap" }],
  setStats: async () => [{ key: "show-opener", label: "Show openers", rows: [{ slug: "madhuvan", name: "Madhuvan", count: 5 }] }],
  catalogProfile: async () => ({ plays: [187], shows: 687 }),
}));

const row = {
  songId: 1, name: "Hot Tea", slug: "hot-tea", isOriginal: true,
  timesPlayed: 187, rotationPct: 29, currentGap: 3, lastPlayedDate: "2026-06-12",
  debutYear: 2017, playsPerYear: [2, 5, 4],
};

import StatsCut from "./page";

async function render(cut: string) {
  const el = await StatsCut({ params: Promise.resolve({ cut }) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
});

describe("StatsCut cut-switcher and methodology footnote", () => {
  it("renders every cut as a filter link with the active one marked steel", async () => {
    const html = await render("current-gaps");
    for (const title of ["Most Played", "Rarities", "Most Overdue", "Debuts", "Set Stats"]) expect(html).toContain(`>${title}</a>`);
    // "Most Overdue" also appears in the page's own <h1>; the switcher's copy is the last one.
    const idx = html.lastIndexOf(">Most Overdue<");
    const tag = html.slice(html.lastIndexOf("<a", idx), idx);
    expect(tag).toContain("text-steel");
    expect(tag).toContain('aria-current="page"');
    const otherIdx = html.indexOf(">Rarities<");
    const otherTag = html.slice(html.lastIndexOf("<a", otherIdx), otherIdx);
    expect(otherTag).not.toContain("text-steel");
    expect(otherTag).not.toContain("aria-current");
    expect(html).toContain('href="/stats/set-stats"');
  });

  it("states criteria + row limit and links the equivalent catalog sort", async () => {
    const html = await render("current-gaps");
    expect(html).toContain("played ≥5 times");
    expect(html).toContain("top 100");
    expect(html).toContain('href="/songs?sort=overdue"');
  });

  it("links table headers to the /songs sorts with the cut's own sort active (2.0's table)", async () => {
    h.experience = "functional";
    const html = await render("rarities");
    expect(html).toContain('href="/songs?sort=az"');
    expect(html).toContain('href="/songs?sort=overdue"');
    expect(html).toContain('aria-sort="ascending"'); // rare = the Played column, ascending
    const overdueTable = await render("current-gaps");
    expect(overdueTable).toContain('aria-sort="descending"'); // overdue = the Gap column, descending
  });

  it("set-stats has no catalog equivalent so the footnote carries no sort link", async () => {
    const html = await render("set-stats");
    expect(html).toContain("top 15 per bucket");
    expect(html).not.toContain("full catalog");
  });

  it("minimal gets the cut row and the footnote too", async () => {
    h.experience = "minimal";
    const html = await render("current-gaps");
    expect(html).toContain(">Most Played</a>");
    expect(html).toContain("<strong>Most Overdue</strong>");
    expect(html).toContain("played ≥5 times");
    expect(html).toContain('href="/songs?sort=overdue"');
  });
});

describe("StatsCut debuts (2.0)", () => {
  it("labels both halves and the chart announces itself as debuts", async () => {
    h.experience = "functional";
    const html = await render("debuts");
    expect(html).toContain(">Debuts per year</h2>");
    expect(html).toContain("Recent debuts");
    expect(html).toContain("latest 1");
    expect(html).toContain('aria-label="Debuts per year"');
    expect(html).not.toContain('role="img"');
  });
});

describe("StatsCut as the hub's shelves at full length (3.0)", () => {
  it("most played: a ranked ledger with level tracks and one line of numbers, no catalog table", async () => {
    const html = await render("most-played");
    expect(html).toContain("cut-ledger");
    expect(html).toContain('data-role="level"');
    expect(html).toContain("rotation 29% · last jun 12, 2026");
    expect(html).not.toContain("<table");
    // The full sortable table is a link away, in the footnote.
    expect(html).toContain('href="/songs"');
    expect(html).toContain("same sort, full catalog");
  });

  it("most overdue: the longest gone as ring tiles, against every show with a setlist", async () => {
    const html = await render("current-gaps");
    expect(html).toContain(">The longest gone</h2>");
    expect(html).toContain('stroke="var(--foil)"');
    expect(html).toContain("187 plays · last jun 12, 2026");
    expect(html).not.toContain("<table");
  });

  it("rarities: grouped by how rare", async () => {
    const html = await render("rarities");
    expect(html).toContain("Played 187 times");
    expect(html).toContain("3 shows since");
  });

  it("debuts: the year columns, then the latest grouped by night with the date tile", async () => {
    const html = await render("debuts");
    expect(html).toContain('aria-label="Debuts per year"');
    expect(html).toContain("The latest 1, by the night they debuted");
    expect(html).toContain("yeti-tile yeti-tile-sm");
    expect(html).toContain(">The Cap</b>");
    expect(html).toContain('href="/songs/hot-tea"');
  });

  it("set stats: each bucket as a ranked ledger, said as a line", async () => {
    const html = await render("set-stats");
    expect(html).toContain("opens the show");
    expect(html).toContain("Madhuvan");
    expect(html).toContain('data-role="level"');
  });
});

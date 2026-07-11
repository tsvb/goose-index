import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({
  experience: "fancy" as "fancy" | "functional" | "minimal",
  total: 1,
  lastOpts: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/songs", () => ({
  OVERDUE_MIN_PLAYS: 5,
  listSongs: async (opts: Record<string, unknown> = {}) => {
    h.lastOpts = opts;
    return {
      rows: [{
        songId: 1, name: "Hot Tea", slug: "hot-tea", isOriginal: true,
        timesPlayed: 187, rotationPct: 29, currentGap: 3, lastPlayedDate: "2026-06-12",
        debutYear: 2017, playsPerYear: [2, 5, 4],
      }],
      total: h.total,
    };
  },
}));

import SongsPage from "./page";

async function render(params: Record<string, string> = {}) {
  const el = await SongsPage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
  h.total = 1;
  h.lastOpts = null;
});

describe("SongsPage name filter", () => {
  it("fancy renders a GET form to /songs seeded with the current q", async () => {
    const html = await render({ q: "tea" });
    expect(html).toContain('action="/songs"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="tea"');
    expect(html).toContain('aria-label="Filter songs by name"');
  });

  it("carries a non-default sort and facet through hidden inputs", async () => {
    const html = await render({ sort: "rare", facet: "covers" });
    expect(html).toContain('name="sort" value="rare"');
    expect(html).toContain('name="facet" value="covers"');
  });

  it("omits the hidden inputs at the defaults", async () => {
    const html = await render();
    expect(html).not.toContain('name="sort"');
    expect(html).not.toContain('name="facet"');
  });

  it("functional renders the filter with a gel button", async () => {
    h.experience = "functional";
    const html = await render({ q: "tea" });
    expect(html).toContain('action="/songs"');
    expect(html).toContain('value="tea"');
    expect(html).toContain("gel");
    expect(html).toContain(">Filter</button>");
  });

  it("minimal renders a plain filter form with a button", async () => {
    h.experience = "minimal";
    const html = await render({ q: "tea", sort: "rare" });
    expect(html).toContain('action="/songs"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="tea"');
    expect(html).toContain('name="sort" value="rare"');
    expect(html).toContain(">Filter</button>");
  });
});

describe("SongsPage sorting", () => {
  it("offers a Rotation sort pill and linked table headers carrying facet/q", async () => {
    const html = await render({ facet: "covers" });
    expect(html).toContain(">Rotation<");                              // new sort in the pill row
    expect(html).toContain('href="/songs?sort=rotation&amp;facet=covers"'); // pill keeps the facet
    expect(html).toContain('href="/songs?sort=az&amp;facet=covers"');  // header link keeps it too
    expect(html).toContain('aria-sort="descending"');                  // default sort marked on Played
  });

  it("states the overdue criterion when sorted by overdue (fancy)", async () => {
    const html = await render({ sort: "overdue" });
    expect(html).toContain("played ≥5 times");
    expect(html).toContain('href="/stats/current-gaps"');
  });

  it("states the overdue criterion in minimal too", async () => {
    h.experience = "minimal";
    const html = await render({ sort: "overdue" });
    expect(html).toContain("played ≥5 times");
    expect(html).toContain('href="/stats/current-gaps"');
  });

  it("keeps the note off other sorts", async () => {
    const html = await render();
    expect(html).not.toContain("played ≥5 times");
  });
});

describe("SongsPage pagination", () => {
  it("passes the page and per-page window to the query", async () => {
    h.total = 613;
    await render({ page: "3" });
    expect(h.lastOpts).toMatchObject({ page: 3, perPage: 100 });
  });

  it("defaults junk page params to 1", async () => {
    await render({ page: "banana" });
    expect(h.lastOpts).toMatchObject({ page: 1 });
    await render({ page: "-2" });
    expect(h.lastOpts).toMatchObject({ page: 1 });
  });

  it("hides the pager when everything fits on one page", async () => {
    h.total = 3; // e.g. ?q=jive
    const html = await render({ q: "jive" });
    expect(html).not.toContain("Page 1 of");
    expect(html).not.toContain("Previous");
  });

  it("renders Previous / Page N of M / Next preserving sort, facet and q", async () => {
    h.total = 250; // 3 pages at 100/page
    const html = await render({ sort: "rare", facet: "covers", q: "a", page: "2" });
    expect(html).toContain("Page 2 of 3");
    expect(html).toContain('href="/songs?sort=rare&amp;facet=covers&amp;q=a&amp;page=3"'); // Next
    expect(html).toContain('href="/songs?sort=rare&amp;facet=covers&amp;q=a"');            // Previous omits page=1
  });

  it("disables Previous on page 1 and Next on the last page", async () => {
    h.total = 150; // 2 pages
    const first = await render({});
    expect(first).toContain("Page 1 of 2");
    expect(first).toContain('href="/songs?page=2"');
    expect(first).not.toContain("page=0");
    expect(first).toContain('aria-disabled="true"'); // placeholder span is machine-readably disabled
    const last = await render({ page: "2" });
    expect(last).toContain("Page 2 of 2");
    expect(last).not.toContain("page=3");
    expect(last).toContain('aria-disabled="true"');
  });

  it("sort and facet links from a deep page land back on page 1", async () => {
    h.total = 613;
    const html = await render({ page: "3" });
    expect(html).toContain('href="/songs?sort=rotation"');   // sort pill + header: no page param
    expect(html).toContain('href="/songs?facet=covers"');    // facet pill: no page param
    expect(html).toContain('href="/songs?page=4"');          // only the pager carries the page
  });

  it("renders the pager in functional too", async () => {
    h.experience = "functional";
    h.total = 250;
    const html = await render({ page: "2" });
    expect(html).toContain("Page 2 of 3");
    expect(html).toContain('href="/songs?page=3"');
  });

  it("renders a plain pager in minimal, preserving the facet", async () => {
    h.experience = "minimal";
    h.total = 250;
    const html = await render({ page: "2", facet: "covers" });
    expect(html).toContain("Page 2 of 3");
    expect(html).toContain("← Previous");
    expect(html).toContain("Next →");
    expect(html).toContain('href="/songs?facet=covers&amp;page=3"');  // Next keeps the facet
    expect(html).toContain('href="/songs?sort=rare&amp;facet=covers"'); // sort links keep facet, drop page
  });
});

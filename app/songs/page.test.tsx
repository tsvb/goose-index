import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({ experience: "fancy" as "fancy" | "functional" | "minimal" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/songs", () => ({
  listSongs: async () => [{
    songId: 1, name: "Hot Tea", slug: "hot-tea", isOriginal: true,
    timesPlayed: 187, rotationPct: 29, currentGap: 3, lastPlayedDate: "2026-06-12",
    debutYear: 2017, playsPerYear: [2, 5, 4],
  }],
}));

import SongsPage from "./page";

async function render(params: Record<string, string> = {}) {
  const el = await SongsPage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
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

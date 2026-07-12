import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({
  experience: "fancy" as "fancy" | "functional" | "minimal",
  highlights: {
    mostPlayed: { name: "Jive II", slug: "jive-ii", plays: 284 } as { name: string; slug: string; plays: number } | null,
    raritiesCount: 37,
    mostOverdue: { name: "Elmeg the Wise", slug: "elmeg-the-wise", gap: 45 } as { name: string; slug: string; gap: number } | null,
    latestDebut: { name: "New One", slug: "new-one", date: "2026-06-30" } as { name: string; slug: string; date: string } | null,
    topOpener: { name: "Madhuvan", slug: "madhuvan", count: 32 } as { name: string; slug: string; count: number } | null,
  },
}));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/songs", () => ({
  OVERDUE_MIN_PLAYS: 5, // cuts.ts folds this into the Most Overdue methodology note
  statsHubHighlights: async () => h.highlights,
}));

import StatsHub from "./page";

async function render() {
  return renderToStaticMarkup(await StatsHub());
}

beforeEach(() => {
  h.experience = "fancy";
  h.highlights = {
    mostPlayed: { name: "Jive II", slug: "jive-ii", plays: 284 },
    raritiesCount: 37,
    mostOverdue: { name: "Elmeg the Wise", slug: "elmeg-the-wise", gap: 45 },
    latestDebut: { name: "New One", slug: "new-one", date: "2026-06-30" },
    topOpener: { name: "Madhuvan", slug: "madhuvan", count: 32 },
  };
});

describe("StatsHub headline stats (fancy/functional)", () => {
  it("shows one live headline per cut", async () => {
    const html = await render();
    expect(html).toContain("Jive II");
    expect(html).toContain("284 plays");
    expect(html).toContain("37");
    expect(html).toContain("songs qualify");
    expect(html).toContain("Elmeg the Wise");
    expect(html).toContain("45-show gap");
    expect(html).toContain("debuted Jun 30, 2026");
    expect(html).toContain("opened 32 shows");
  });

  it("still links every cut card", async () => {
    const html = await render();
    for (const slug of ["most-played", "rarities", "current-gaps", "debuts", "set-stats", "oracle"])
      expect(html).toContain(`href="/stats/${slug}"`);
  });

  it("drops a headline gracefully when its cut is empty", async () => {
    h.highlights = { mostPlayed: null, raritiesCount: 0, mostOverdue: null, latestDebut: null, topOpener: null };
    const html = await render();
    expect(html).toContain('href="/stats/most-played"'); // cards survive
    expect(html).not.toContain("plays</span>");
    expect(html).toContain("0"); // rarities count still renders as a number
  });

  it("functional shares the card body", async () => {
    h.experience = "functional";
    const html = await render();
    expect(html).toContain("surface-card");
    expect(html).toContain("284 plays");
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
  });

  it("falls back to an em dash for empty cuts", async () => {
    h.experience = "minimal";
    h.highlights = { mostPlayed: null, raritiesCount: 0, mostOverdue: null, latestDebut: null, topOpener: null };
    const html = await render();
    expect(html).toContain("—");
    expect(html).toContain("0 songs qualify");
  });
});

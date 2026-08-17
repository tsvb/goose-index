import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ShowSummary } from "@/lib/queries/shows";

const h = vi.hoisted(() => ({ experience: "fancy" as "fancy" | "functional" | "minimal" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/site", () => ({ entityMetadata: () => ({}), canonicalUrl: (p: string) => p }));
vi.mock("@/lib/queries/dimensions", () => ({
  listYears: async () => [{ year: 2024, shows: 2, songs: 37 }],
}));
vi.mock("@/lib/queries/shows", () => ({
  listShows: async () => ({
    rows: [
      { showId: 1, date: "2024-06-01", order: null, venue: "Red Rocks Amphitheatre", city: "Morrison", state: "CO", country: "USA", tour: "Summer Tour 2024", tourId: 130, songCount: 19, hasNotes: false },
      { showId: 2, date: "2024-08-30", order: null, venue: "Dillon Amphitheater", city: "Dillon", state: "CO", country: "USA", tour: null, tourId: null, songCount: 18, hasNotes: true },
    ] satisfies ShowSummary[],
    total: 2,
  }),
}));

import YearPage from "./page";

async function render() {
  const el = await YearPage({ params: Promise.resolve({ year: "2024" }) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
});

describe("YearPage", () => {
  it("fancy renders one h1 with the year, the fixture rows' ledger hrefs, and no surface-card", async () => {
    const html = await render();
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain(">2024<");
    expect(html).toContain('href="/shows/2024-06-01"');
    expect(html).toContain('href="/shows/2024-08-30"');
    expect(html).not.toContain("surface-card");
  });
});

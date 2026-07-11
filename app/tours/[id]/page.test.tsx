import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ShowSummary } from "@/lib/queries/shows";

const h = vi.hoisted(() => ({ experience: "fancy" as "fancy" | "functional" | "minimal" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/site", () => ({ entityOpenGraph: () => ({}) }));
vi.mock("@/lib/queries/dimensions", () => ({
  getTourMeta: async () => ({
    tourId: 130, name: "Summer Tour 2024", year: 2024, shows: 2, start: "2024-06-01", end: "2024-08-30",
  }),
}));
vi.mock("@/lib/queries/shows", () => ({
  listShows: async () => ({
    rows: [
      { showId: 1, date: "2024-06-01", order: null, venue: "Red Rocks Amphitheatre", city: "Morrison", state: "CO", country: "USA", tour: "Summer Tour 2024", tourId: 130, songCount: 19, hasNotes: false },
      { showId: 2, date: "2024-08-30", order: null, venue: "Dillon Amphitheater", city: "Dillon", state: "CO", country: "USA", tour: "Summer Tour 2024", tourId: 130, songCount: 18, hasNotes: true },
    ] satisfies ShowSummary[],
    total: 2,
  }),
}));

import TourPage from "./page";

async function render() {
  const el = await TourPage({ params: Promise.resolve({ id: "130" }) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
});

describe("TourPage show rows are tour-aware", () => {
  it("names the tour once (hero) — rows drop the repeated eyebrow but keep venues", async () => {
    const html = await render();
    expect(html.split("Summer Tour 2024").length - 1).toBe(1); // hero only, not per row
    expect(html).toContain("Red Rocks Amphitheatre");
    expect(html).toContain("Dillon Amphitheater");
    expect(html).toContain("Morrison, CO");
  });
});

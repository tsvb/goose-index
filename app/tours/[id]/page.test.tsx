import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ShowSummary } from "@/lib/queries/shows";

const h = vi.hoisted(() => ({ experience: "fancy" as "fancy" | "functional" | "minimal" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/site", () => ({ entityMetadata: () => ({}) }));
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

describe("TourPage smoke test", () => {
  it("renders one h1, showHref ledger rows, and no card chrome", async () => {
    const html = await render();
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain(">Summer Tour 2024<");
    expect(html).toContain('href="/shows/2024-06-01"');
    expect(html).toContain('href="/shows/2024-08-30"');
    expect(html).not.toContain("surface-card");
    expect(html).not.toContain("rounded-lg");
  });
});

describe("TourPage as Yeti's artist page (3.0)", () => {
  it("heads the page with the run's year ring and its counts in plain type", async () => {
    const html = await render();
    expect(html).toContain('data-arc="past"');
    expect(html).toContain("2 shows · 2 cities · jun 1 – aug 30, 2024 · 2 legs");
    expect(html).toContain('href="/tours"');
  });

  it("splits the shows into legs where the band went home, in order, numbered", async () => {
    const html = await render();
    expect(html).toContain("Leg 1 · jun 1 · 1 show");
    expect(html).toContain("Leg 2 · aug 30 · 1 show · after 90 days home");
    expect(html).toContain("19 songs");
  });

  it("keeps 2.0's ledger for 2.0", async () => {
    h.experience = "functional";
    const html = await render();
    expect(html).not.toContain("data-arc");
    expect(html).not.toContain("Leg 1");
  });
});

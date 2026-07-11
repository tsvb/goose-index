import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ShowSummary } from "@/lib/queries/shows";

const h = vi.hoisted(() => ({ experience: "fancy" as "fancy" | "functional" | "minimal" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/site", () => ({ entityOpenGraph: () => ({}) }));
vi.mock("@/lib/queries/dimensions", () => ({
  getVenueMeta: async () => ({
    venueId: 303, name: "Dillon Amphitheater", city: "Dillon", state: "CO", country: "USA",
    capacity: 3656, shows: 2, first: "2023-07-01", last: "2024-08-30",
  }),
}));
vi.mock("@/lib/queries/shows", () => ({
  listShows: async () => ({
    rows: [
      { showId: 1, date: "2024-08-30", order: null, venue: "Dillon Amphitheater", city: "Dillon", state: "CO", country: "USA", tour: "Summer Tour 2024", tourId: 130, songCount: 18, hasNotes: false },
      { showId: 2, date: "2023-07-01", order: null, venue: "Dillon Amphitheater", city: "Dillon", state: "CO", country: "USA", tour: null, tourId: null, songCount: 20, hasNotes: true },
    ] satisfies ShowSummary[],
    total: 2,
  }),
}));

import VenuePage from "./page";

async function render() {
  const el = await VenuePage({ params: Promise.resolve({ id: "303" }) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
});

describe("VenuePage show rows are venue-aware", () => {
  it("names the venue once (hero) — rows promote the date instead", async () => {
    const html = await render();
    expect(html.split("Dillon Amphitheater").length - 1).toBe(1); // hero only, not per row
    expect(html).toContain("August 30, 2024"); // date in the row display slot
    expect(html).toContain("July 1, 2023");
    expect(html).toContain("Summer Tour 2024"); // tour survives in the row
  });

  it("minimal drops the venue/location columns from the show table", async () => {
    h.experience = "minimal";
    const html = await render();
    expect(html).not.toContain(">Venue</th>");
    expect(html).not.toContain(">Location</th>");
    expect(html).toContain('href="/shows/2024-08-30"');
    expect(html.split("Dillon Amphitheater").length - 1).toBe(2); // breadcrumb + h1, not per row
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ShowSummary } from "@/lib/queries/shows";

const h = vi.hoisted(() => ({ experience: "fancy" as "fancy" | "functional" | "minimal", rows: [] as ShowSummary[] }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/shows", () => ({ getOnThisDay: async () => h.rows }));

import OnThisDayPage from "./page";

async function render() {
  return renderToStaticMarkup(await OnThisDayPage());
}

const ROWS: ShowSummary[] = [
  { showId: 1, date: "2024-08-16", order: null, venue: "Red Rocks Amphitheatre", city: "Morrison", state: "CO", country: "USA", tour: "Summer Tour 2024", tourId: 130, songCount: 19, hasNotes: false },
  { showId: 2, date: "2019-08-16", order: null, venue: "Dillon Amphitheater", city: "Dillon", state: "CO", country: "USA", tour: null, tourId: null, songCount: 18, hasNotes: true },
];

beforeEach(() => {
  h.experience = "fancy";
  h.rows = ROWS;
});

describe("OnThisDayPage", () => {
  it("fancy renders one h1 and the fixture rows' ledger hrefs, no ShowCard classes", async () => {
    const html = await render();
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/shows/2024-08-16"');
    expect(html).toContain('href="/shows/2019-08-16"');
    expect(html).not.toContain("rounded-lg");
    expect(html).not.toContain("surface-card");
  });
});

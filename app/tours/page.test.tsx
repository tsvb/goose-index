import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { TourRow, TourSpan } from "@/lib/queries/dimensions";

const h = vi.hoisted(() => ({ experience: "fancy" as "fancy" | "functional" | "minimal" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/site", () => ({ canonicalUrl: (p: string) => p }));
vi.mock("@/lib/queries/dimensions", () => ({
  listTours: async () => [
    { tourId: 1, name: "Summer Tour 2024", year: 2024, shows: 5, start: "2024-06-01", end: "2024-08-01" },
    { tourId: 2, name: "Winter Tour 2023", year: 2023, shows: 3, start: "2023-12-01", end: "2023-12-20" },
  ] satisfies TourRow[],
  tourTimeline: async () => ({
    tours: [
      { tourId: 1, name: "Summer Tour 2024", start: "2024-06-01", end: "2024-08-01", shows: 5, dates: ["2024-06-01", "2024-08-01"], upcoming: 0 },
      { tourId: 2, name: "Winter Tour 2023", start: "2023-12-01", end: "2023-12-20", shows: 3, dates: ["2023-12-01", "2023-12-20"], upcoming: 0 },
    ] satisfies TourSpan[],
    untouredShows: 0,
  }),
}));

import ToursPage from "./page";

async function render() {
  const el = await ToursPage();
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
});

describe("ToursPage", () => {
  it("renders one h1, /tours/<id> rows, year section headings, and no card chrome", async () => {
    const html = await render();
    expect((html.match(/<h1/g) ?? []).length).toBe(1);
    expect(html).toContain('href="/tours/1"');
    expect(html).toContain('href="/tours/2"');
    expect(html).not.toContain("surface-card");
    expect(html).not.toContain("rounded-lg");
    // SectionRule year headings, one per group.
    expect(html).toContain(">2024<");
    expect(html).toContain(">2023<");
  });
});

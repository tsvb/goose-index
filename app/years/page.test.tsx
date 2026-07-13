import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({ experience: "fancy" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/dimensions", () => ({
  listYears: async () => [
    { year: 2024, shows: 62, songs: 1204 },
    { year: 2023, shows: 1, songs: 18 },
  ],
  careerYears: async () => [
    // 2023 is deliberately under-documented: one show logged, no setlist.
    { year: 2023, shows: 1, documented: 0, performances: 18, uniqueSongs: 12, debuts: 2, partial: false },
    { year: 2024, shows: 62, documented: 62, performances: 1204, uniqueSongs: 140, debuts: 9, partial: true },
  ],
}));

import YearsPage from "./page";

async function render() {
  return renderToStaticMarkup(await YearsPage());
}

beforeEach(() => {
  h.experience = "fancy";
});

describe("YearsPage", () => {
  it("links every year to its /years/<y> page with show and song counts", async () => {
    const html = await render();
    expect(html).toContain('href="/years/2024"');
    expect(html).toContain('href="/years/2023"');
    expect(html).toContain("62 shows");
    expect(html).toContain("1,204 songs played");
    expect(html).toContain("1 show ·"); // singular
  });

  it("minimal experience renders the plain document table with the same links", async () => {
    h.experience = "minimal";
    const html = await render();
    expect(html).toContain('href="/years/2024"');
    expect(html).toContain('href="/years/2023"');
    expect(html).toContain("2 years");
  });
});

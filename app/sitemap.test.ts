import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/queries/sitemap", () => ({
  allShowDates: async () => ["2021-07-03"],
  allSongSlugs: async () => ["hot-tea"],
  allYears: async () => [2021, 2022],
  allTourIds: async () => [5],
  allVenueIds: async () => [9],
}));
vi.mock("@/lib/blog/posts", () => ({
  allPostSlugs: () => ["a-post"],
}));

import sitemap from "./sitemap";
import { SITE_URL } from "@/lib/site";

describe("sitemap", () => {
  it("lists the section indexes, including /years and /blog", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    for (const path of ["/shows", "/songs", "/stats", "/tours", "/venues", "/years", "/on-this-day", "/blog"]) {
      expect(urls).toContain(`${SITE_URL}${path}`);
    }
  });

  it("includes year, tour, and venue detail URLs alongside shows and songs", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain(`${SITE_URL}/years/2021`);
    expect(urls).toContain(`${SITE_URL}/years/2022`);
    expect(urls).toContain(`${SITE_URL}/tours/5`);
    expect(urls).toContain(`${SITE_URL}/venues/9`);
    expect(urls).toContain(`${SITE_URL}/shows/2021-07-03`);
    expect(urls).toContain(`${SITE_URL}/songs/hot-tea`);
    expect(urls).toContain(`${SITE_URL}/blog/a-post`);
  });
});

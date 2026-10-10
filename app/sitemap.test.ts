import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/queries/sitemap", () => ({
  allShowDates: async () => [{ key: "2021-07-03", lastmod: "2021-07-05" }],
  allSongSlugs: async () => [{ key: "hot-tea", lastmod: "2022-01-01" }],
  allYears: async () => [{ key: 2021, lastmod: "2021-07-05" }, { key: 2022, lastmod: "2022-01-01" }],
  allTourIds: async () => [{ key: 5, lastmod: "2022-01-01" }],
  allVenueIds: async () => [{ key: 9, lastmod: "2021-07-05" }],
  catalogLastmod: async () => "2022-01-01",
}));
vi.mock("@/lib/blog/posts", () => ({
  listPosts: () => [
    { slug: "newer-post", date: "2026-08-01" },
    { slug: "a-post", date: "2026-07-20" },
  ],
}));

import sitemap from "./sitemap";
import { SITE_URL } from "@/lib/site";

const entry = async (path: string) => (await sitemap()).find((e) => e.url === `${SITE_URL}${path}`);

describe("sitemap", () => {
  it("lists the section indexes, including /years and /blog", async () => {
    const urls = (await sitemap()).map((e) => e.url);
    for (const path of ["/shows", "/songs", "/stats", "/tours", "/venues", "/years", "/on-this-day", "/blog", "/listen-links"]) {
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

  it("stamps each detail page with its own lastmod", async () => {
    expect((await entry("/shows/2021-07-03"))?.lastModified).toBe("2021-07-05");
    expect((await entry("/songs/hot-tea"))?.lastModified).toBe("2022-01-01");
    expect((await entry("/tours/5"))?.lastModified).toBe("2022-01-01");
    expect((await entry("/venues/9"))?.lastModified).toBe("2021-07-05");
    expect((await entry("/years/2021"))?.lastModified).toBe("2021-07-05");
  });

  it("stamps catalog-wide pages with the catalog's lastmod", async () => {
    for (const path of ["", "/shows", "/songs", "/stats", "/stats/most-played"]) {
      expect((await entry(path))?.lastModified).toBe("2022-01-01");
    }
  });

  it("dates blog posts by their post date, and /blog by the newest post", async () => {
    expect((await entry("/blog/a-post"))?.lastModified).toBe("2026-07-20");
    expect((await entry("/blog"))?.lastModified).toBe("2026-08-01");
  });

  it("omits lastmod where nothing dates the page, rather than guessing", async () => {
    for (const path of ["/on-this-day", "/listen-links"]) {
      const e = await entry(path);
      expect(e).toBeDefined();
      expect(e).not.toHaveProperty("lastModified");
    }
  });
});

import { describe, expect, it } from "vitest";
import robots from "./robots";
import { SITE_URL } from "@/lib/site";

/** Google's rule: a disallow matches when the path (with query) starts with it. */
function blocked(disallow: string[], url: string): boolean {
  return disallow.some((rule) => url.startsWith(rule));
}

describe("robots", () => {
  const doc = robots();
  const rules = Array.isArray(doc.rules) ? doc.rules : [doc.rules];
  const disallow = [rules[0]?.disallow ?? []].flat();

  it("points crawlers at the sitemap", () => {
    expect(doc.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });

  it("keeps crawlers off /api/, search, and the browse pages' query strings", () => {
    for (const url of ["/api/live", "/search", "/search?q=tumble", "/shows?year=2024", "/songs?sort=gap", "/venues?q=NY"]) {
      expect(blocked(disallow, url), url).toBe(true);
    }
  });

  it("leaves every canonical page crawlable, a second show's ?n= included", () => {
    for (const url of ["/", "/shows", "/songs", "/venues", "/shows/2024-06-01", "/shows/2024-06-01?n=2", "/songs/hot-tea?page=2", "/venues/303", "/stats/debuts"]) {
      expect(blocked(disallow, url), url).toBe(false);
    }
  });
});

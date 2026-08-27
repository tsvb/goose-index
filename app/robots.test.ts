import { describe, expect, it } from "vitest";
import robots from "./robots";
import { SITE_URL } from "@/lib/site";

describe("robots", () => {
  it("points crawlers at the sitemap and off /api/", () => {
    const doc = robots();
    expect(doc.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
    const rules = Array.isArray(doc.rules) ? doc.rules : [doc.rules];
    expect(rules[0]?.disallow).toEqual(["/api/"]);
  });
});

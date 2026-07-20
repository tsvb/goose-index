import { describe, it, expect, vi } from "vitest";
import { parseMarkdown } from "@/lib/blog/markdown";

vi.mock("@/lib/blog/posts", () => ({
  listPosts: () => [
    {
      slug: "a-post",
      title: "A post & its title",
      date: "2026-07-01",
      summary: "Summary with <angles> & ampersands.",
      tags: [],
      body: parseMarkdown("Body with [[show:2021-07-03]] and **bold**."),
    },
  ],
}));

import { GET } from "./route";

describe("GET /blog/feed.xml", () => {
  it("serves valid-shaped RSS 2.0 with escaped text and absolute URLs", async () => {
    const res = await GET();
    expect(res.headers.get("content-type")).toContain("application/rss+xml");
    const xml = await res.text();
    expect(xml).toContain(`<?xml version="1.0" encoding="UTF-8"?>`);
    expect(xml).toContain("<title>A post &amp; its title</title>");
    expect(xml).toContain("<description>Summary with &lt;angles&gt; &amp; ampersands.</description>");
    expect(xml).toContain("<link>https://www.gooseindex.com/blog/a-post</link>");
    expect(xml).toContain(`<guid isPermaLink="true">https://www.gooseindex.com/blog/a-post</guid>`);
    expect(xml).toContain("<pubDate>Wed, 01 Jul 2026 00:00:00 GMT</pubDate>");
    // Full rendered post rides along, double-escaped inside content:encoded.
    expect(xml).toContain("&lt;strong&gt;bold&lt;/strong&gt;");
    expect(xml).toContain("https://www.gooseindex.com/shows/2021-07-03");
    // No raw markup can survive outside the tags we wrote ourselves.
    expect(xml).not.toContain("<angles>");
  });
});

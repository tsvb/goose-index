import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({ experience: "fancy", empty: false }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/blog/posts", () => ({
  listPosts: () =>
    h.empty
      ? []
      : [
          {
            slug: "second-post",
            title: "The second post",
            date: "2026-07-01",
            summary: "A later note about the charts.",
            tags: [],
            body: [],
          },
          {
            slug: "first-post",
            title: "The first post",
            date: "2026-06-01",
            summary: "The note that started the blog.",
            tags: ["site"],
            body: [],
          },
        ],
}));

import BlogPage from "./page";

async function render() {
  return renderToStaticMarkup(await BlogPage());
}

beforeEach(() => {
  h.experience = "fancy";
  h.empty = false;
});

describe("BlogPage", () => {
  it("lists every post with its date, summary, and link, plus the feed", async () => {
    const html = await render();
    expect(html).toContain('href="/blog/second-post"');
    expect(html).toContain('href="/blog/first-post"');
    expect(html).toContain("The second post");
    expect(html).toContain("A later note about the charts.");
    expect(html).toContain("Jul 1, 2026");
    expect(html).toContain("2 posts");
    expect(html).toContain('href="/blog/feed.xml"');
  });

  it("minimal renders the plain document table with the same links", async () => {
    h.experience = "minimal";
    const html = await render();
    expect(html).toContain("doc-table");
    expect(html).toContain('href="/blog/second-post"');
    expect(html).toContain('href="/blog/first-post"');
    expect(html).toContain("2 posts");
    expect(html).toContain('href="/blog/feed.xml"');
  });
});

// The empty state is honest rather than an error.
describe("BlogPage with no posts", () => {
  it("says so plainly", async () => {
    h.empty = true;
    const html = await render();
    expect(html).toContain("No posts yet.");
    expect(html).toContain("0 posts");
  });
});

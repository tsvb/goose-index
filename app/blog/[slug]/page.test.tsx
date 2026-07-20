import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { parseMarkdown } from "@/lib/blog/markdown";
import type { Post } from "@/lib/blog/posts";

const h = vi.hoisted(() => ({ experience: "fancy" }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const POSTS: Post[] = [
  {
    slug: "newer",
    title: "The newer post",
    date: "2026-07-01",
    summary: "Summary of the newer post.",
    tags: [],
    body: parseMarkdown("Newer body."),
  },
  {
    slug: "the-post",
    title: "The post under test",
    date: "2026-06-01",
    summary: "Summary of the post under test.",
    tags: ["site", "engine"],
    body: parseMarkdown("## Section\n\nBody text with [[song:hot-tea]]."),
  },
  {
    slug: "older",
    title: "The older post",
    date: "2026-05-01",
    summary: "Summary of the older post.",
    tags: [],
    body: parseMarkdown("Older body."),
  },
];

vi.mock("@/lib/blog/posts", () => ({
  listPosts: () => POSTS,
  getPost: (slug: string) => POSTS.find((p) => p.slug === slug) ?? null,
}));

import BlogPostPage, { generateMetadata } from "./page";

async function render(slug: string) {
  return renderToStaticMarkup(await BlogPostPage({ params: Promise.resolve({ slug }) }));
}

beforeEach(() => {
  h.experience = "fancy";
});

describe("BlogPostPage", () => {
  it("renders title, date, summary, body, and BlogPosting JSON-LD", async () => {
    const html = await render("the-post");
    expect(html).toContain("The post under test");
    expect(html).toContain("Jun 1, 2026");
    expect(html).toContain("Summary of the post under test.");
    expect(html).toContain('<h2 id="section">Section</h2>');
    expect(html).toContain('href="/songs/hot-tea"');
    expect(html).toContain("BlogPosting");
    expect(html).toContain("filed under: site · engine");
  });

  it("walks to its neighbors: older ←, newer →", async () => {
    const html = await render("the-post");
    expect(html).toContain('href="/blog/older"');
    expect(html).toContain('href="/blog/newer"');
  });

  it("the oldest post says it is the first instead of dangling a dead arrow", async () => {
    const html = await render("older");
    expect(html).toContain("This is the first post.");
  });

  it("minimal renders the plain document with breadcrumb and meta table", async () => {
    h.experience = "minimal";
    const html = await render("the-post");
    expect(html).toContain("doc-crumb");
    expect(html).toContain("Monday, June 1, 2026");
    expect(html).toContain('href="/blog"');
    expect(html).toContain("post-prose");
  });

  it("404s on a slug that isn't a post", async () => {
    await expect(render("no-such")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});

describe("generateMetadata", () => {
  it("carries title, description, and canonical for a real post", async () => {
    const parent = Promise.resolve({ openGraph: { images: [] } }) as never;
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "the-post" }) }, parent);
    expect(meta.title).toBe("The post under test");
    expect(meta.description).toBe("Summary of the post under test.");
    expect(meta.alternates?.canonical).toBe("https://www.gooseindex.com/blog/the-post");
  });

  it("titles the 404 plainly", async () => {
    const parent = Promise.resolve({}) as never;
    const meta = await generateMetadata({ params: Promise.resolve({ slug: "no-such" }) }, parent);
    expect(meta.title).toBe("Post not found");
  });
});

// The gate between authors and visitors: parse every REAL post in
// content/blog. The engine throws on anything outside its grammar, so a
// malformed post fails this test in CI instead of 500ing a page in
// production. If this test is red, fix the post, not the parser.

import { describe, it, expect } from "vitest";
import { listPosts } from "./posts";

describe("content/blog", () => {
  it("every published post parses cleanly", () => {
    const posts = listPosts();
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(post.body.length, `${post.slug} has an empty body`).toBeGreaterThan(0);
    }
  });

  it("summaries are real sentences, not stubs — the index and the feed show them", () => {
    for (const post of listPosts()) {
      expect(post.summary.length, `${post.slug} summary too short`).toBeGreaterThan(20);
    }
  });
});

import { describe, it, expect, afterAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listPosts, getPost, allPostSlugs } from "./posts";

const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "__fixtures__", "posts");

const tmpDirs: string[] = [];
function scratchDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "goose-blog-"));
  tmpDirs.push(dir);
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), content);
  }
  return dir;
}
afterAll(() => {
  for (const dir of tmpDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe("listPosts", () => {
  it("reads the directory, newest first, with parsed bodies", () => {
    const posts = listPosts(FIXTURES);
    expect(posts.map((p) => p.slug)).toEqual(["newer-post", "older-post"]);
    expect(posts[0]).toMatchObject({ title: "A newer note", date: "2026-06-15", tags: [] });
    expect(posts[0].body[0]).toMatchObject({ kind: "heading", id: "a-heading" });
  });

  it("returns [] for a missing directory rather than pretending it's an error page", () => {
    expect(listPosts(path.join(FIXTURES, "nope"))).toEqual([]);
  });

  it("names the offending file when a post is malformed", () => {
    const dir = scratchDir({ "bad-date.md": "---\ntitle: T\ndate: someday\nsummary: S\n---\n" });
    expect(() => listPosts(dir)).toThrow(/bad-date\.md.*YYYY-MM-DD/);
  });

  it("refuses a filename that isn't a lowercase-hyphen slug", () => {
    const dir = scratchDir({ "Bad Name.md": "---\ntitle: T\ndate: 2026-01-02\nsummary: S\n---\n" });
    expect(() => listPosts(dir)).toThrow(/lowercase-hyphen slug/);
  });

  it("date ties break on slug so the order is deterministic", () => {
    const post = "---\ntitle: T\ndate: 2026-01-02\nsummary: S\n---\n";
    const dir = scratchDir({ "beta.md": post, "alpha.md": post });
    expect(listPosts(dir).map((p) => p.slug)).toEqual(["alpha", "beta"]);
  });
});

describe("getPost", () => {
  it("finds a post by slug and returns null for a stranger", () => {
    expect(getPost("older-post", FIXTURES)?.title).toBe("An older note");
    expect(getPost("no-such-post", FIXTURES)).toBeNull();
  });

  it("never lets URL input near the filesystem unless it's a plain slug", () => {
    expect(getPost("../../.env", FIXTURES)).toBeNull();
    expect(getPost("..%2F..%2F.env", FIXTURES)).toBeNull();
    expect(getPost("older-post/", FIXTURES)).toBeNull();
    expect(getPost("", FIXTURES)).toBeNull();
  });
});

describe("allPostSlugs", () => {
  it("mirrors listPosts order", () => {
    expect(allPostSlugs(FIXTURES)).toEqual(["newer-post", "older-post"]);
  });
});

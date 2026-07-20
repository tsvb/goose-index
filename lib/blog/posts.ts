// The post store. Posts are markdown files in content/blog/, committed to
// git — deliberately NOT rows in Postgres. The database is the cached
// live-performance record and nothing else writes to it; prose ships with the
// code, gets reviewed like code, and deploys like code. Drafting is a git
// branch: a post on a branch renders on that branch's preview deploy and
// publishes when it merges. No draft flag, no CMS, no second write path.
//
// A malformed post throws here with its filename. That can't reach visitors:
// the content test (content.test.ts) parses every real post, so CI refuses
// the commit instead.

import fs from "node:fs";
import path from "node:path";
import { parseFrontMatter } from "./frontmatter";
import { parseMarkdown, type Block } from "./markdown";

export type PostMeta = {
  slug: string;
  title: string;
  date: string; // YYYY-MM-DD
  summary: string;
  tags: string[];
};

export type Post = PostMeta & { body: Block[] };

export const CONTENT_DIR = path.join(process.cwd(), "content", "blog");

// Filename (minus .md) is the slug and therefore the URL.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function loadFile(dir: string, filename: string): Post {
  const slug = filename.replace(/\.md$/, "");
  if (!SLUG.test(slug)) {
    throw new Error(`content/blog/${filename}: filename must be a lowercase-hyphen slug`);
  }
  const source = fs.readFileSync(path.join(dir, filename), "utf8");
  try {
    const { meta, body } = parseFrontMatter(source);
    return { slug, ...meta, body: parseMarkdown(body) };
  } catch (e) {
    throw new Error(`content/blog/${filename}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Every post, newest first (date desc, slug as the tiebreak). Reads the
 *  filesystem per call — the site renders per-request anyway, post counts are
 *  small, and a cache would be one more thing that can lie. */
export function listPosts(dir: string = CONTENT_DIR): Post[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => loadFile(dir, f))
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));
}

/** One post by slug, or null. The slug gate doubles as path-traversal armor —
 *  URL input never reaches the filesystem unless it is a plain slug. */
export function getPost(slug: string, dir: string = CONTENT_DIR): Post | null {
  if (!SLUG.test(slug)) return null;
  const file = path.join(dir, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  return loadFile(dir, `${slug}.md`);
}

/** Slugs for the sitemap and feed, cheap and in the same order as listPosts. */
export function allPostSlugs(dir: string = CONTENT_DIR): string[] {
  return listPosts(dir).map((p) => p.slug);
}

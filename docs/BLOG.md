# Writing for the blog

Posts are markdown files in [`content/blog/`](../content/blog). The engine is
[`lib/blog/`](../lib/blog) — hand-rolled front matter parser, markdown parser,
and HTML renderer, with no dependencies. This file is the authoring contract;
if the engine and this doc disagree, the engine's tests win and this doc has a
bug.

## A post

```
content/blog/my-post-slug.md        ← filename (minus .md) is the slug is the URL
```

```markdown
---
title: The post's title
date: 2026-07-20
summary: One honest sentence. Shown on /blog, in search results, and in the feed.
tags: site, engine
---

Body starts after the closing fence.
```

- `title`, `date` (YYYY-MM-DD), and `summary` are required; `tags`
  (comma-separated) is optional. Unknown keys are errors.
- Filenames must be lowercase-hyphen slugs (`[a-z0-9-]`).
- Posts sort newest first; same-day posts sort by slug.

## Publishing workflow

The draft mechanism is git:

1. Write the post on a branch.
2. Proofread it on the branch's Vercel preview deploy.
3. Merge. The post is live on the next production deploy — and in the
   [RSS feed](https://www.gooseindex.com/blog/feed.xml), the sitemap, and the
   `/blog` index, all of which derive from the content directory at request
   time.

There is no draft flag, no scheduled publishing, and no CMS. A post committed
to `main` is published; a post on a branch is a draft.

## The grammar

Everything the parser accepts. Anything else throws, and CI runs the parser
over every real post (`lib/blog/content.test.ts`), so a malformed post fails
the build instead of a page.

| Write | Get |
|---|---|
| `## Heading` / `### Heading` | h2 / h3 with a stable `#anchor-id` (`#` is the title's; `####` is an error) |
| blank-line-separated text | paragraphs (soft-wrapped lines fold together) |
| `- item` / `* item` | unordered list (indent 2+ spaces to continue an item; a nested list is an error) |
| `1. item` | ordered list |
| `> line` | blockquote (a bare `>` splits paragraphs) |
| ```` ```lang ```` … ```` ``` ```` | code block, verbatim, no highlighting |
| `---` on its own line | rule |
| `![alt](/path.png)` on its own line | image |
| `\| Hotel \| GA \|` / `\|---\|---:\|` / `\| Ocean \| $1 \|` | table — pipe-fenced rows, same column count throughout, or it's an error; `---:` right-aligns a column (numbers go mono), `:---:` centers; `\\\|` is a literal pipe |
| `**bold**`, `*em*`, `_em_`, `` `code` `` | the usual inlines (`_` needs a word edge, so `snake_case` survives; a spaced `*` is literal) |
| `[text](https://… or /path or #anchor or mailto:…)` | link — other schemes (including protocol-relative `//`) are errors, and so is link-shaped text that doesn't parse |
| `\*`, `\[`, … | literal syntax characters |

No raw HTML, by design — that is what makes the renderer safe without a
sanitizer, in pages and in the feed.

## Dataset references

The bespoke part. Two inline shorthands link into the index:

| Write | Get |
|---|---|
| `[[show:2021-07-03]]` | link to `/shows/2021-07-03`, labelled "Jul 3, 2021" |
| `[[show:2021-07-03\|that Goosemas]]` | same link, your label |
| `[[song:hot-tea]]` | link to `/songs/hot-tea`, labelled "Hot Tea" (title-cased slug) |
| `[[song:hot-tea\|the encore]]` | same link, your label |

The parser validates the *shape* (date, slug) at build time; it does not check
that the target exists. A typo'd slug 404s like any bad link.

## Voice

Blog posts are site copy. The rules in [`CLAUDE.md`](../CLAUDE.md#copy-and-voice)
apply in full — most of all: **a number in prose goes stale every night the
sync runs**, so date any figure you quote ("as of July 2026, …") or link to
the live page that computes it instead.

## Engine map

| File | Job |
|---|---|
| `lib/blog/frontmatter.ts` | the four-key front matter grammar |
| `lib/blog/markdown.ts` | markdown → typed AST (the contract above) |
| `lib/blog/html.ts` | AST → HTML strings for the feed, absolute URLs |
| `lib/blog/posts.ts` | content dir → sorted, validated posts |
| `lib/blog/content.test.ts` | CI gate: parses every real post |
| `app/_components/post-body.tsx` | AST → React, `.post-prose` typography |
| `app/blog/…` | index, post pages (all three editions), RSS route |

One deployment quirk worth knowing: the content directory is read with `fs`
at request time, so `next.config.ts` lists it in `outputFileTracingIncludes`.
A new route that reads posts must be added there, or it will ship without the
content directory and truthfully report "No posts yet."

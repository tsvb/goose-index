---
title: How this blog works
date: 2026-07-20
summary: Markdown files in git, a hand-rolled parser, and two link shorthands into the dataset. No CMS, no new tables, no new dependencies.
tags: site, engine
---

This site hand-rolls its charts because each question deserves the form its
number actually is. The blog is built the same way: the whole engine lives in
this repository, and this post documents it.

## Posts are files

A post is a markdown file in `content/blog/`. The filename is the slug is the
URL — this one is `how-this-blog-works.md`. The top of the file carries four
front matter keys and no more:

```
---
title: How this blog works
date: 2026-07-20
summary: One honest sentence, shown on the index and in the feed.
tags: site, engine
---
```

There is no CMS and no database table behind this page. The Postgres database
holds the cached live-performance record, and the sync job is the only thing
that writes to it; prose has no business in there. A post ships with the code:
it gets drafted on a git branch, proofread on the branch's preview deploy, and
published by merging. The draft mechanism is version control, because it
already existed.

## The grammar is small on purpose

The parser accepts headings, paragraphs, lists, quotes, code fences, images,
rules, and the usual inline emphasis, code, and links. That list is the whole
contract. Anything outside it — raw HTML, a fourth heading level, a
`javascript:` link — is a parse error, not a guess.

Errors can't reach you: the test suite parses every post in `content/blog`,
so a malformed post fails CI instead of failing a page. The repo's own style
guide puts it plainly:

> Copy that overstates what the numbers support is a bug, not a matter of
> taste — treat it like one.

The same rule applies here, enforced the same way everything else in this
repository is enforced: by making the honest path the one that compiles.

## Two shorthands into the dataset

The one thing a generic engine couldn't give this site: `[[show:...]]` and
`[[song:...]]` references that link into the index. Writing
`[[show:2021-07-03]]` renders [[show:2021-07-03]], and
`[[song:hot-tea]]` renders [[song:hot-tea]] — a date becomes its show page,
a slug becomes its song page, labelled honestly by default and overridable
with `[[song:hot-tea|the encore version]]`.

The engine checks the shape of a reference, not its target — a mistyped slug
still 404s like any wrong link would. What the shorthand buys is that a post
about a show can point at the record with four characters of ceremony instead
of a pasted URL.

## The feed

[RSS lives at /blog/feed.xml](/blog/feed.xml). Each item carries the summary
as its description and the full rendered post in `content:encoded`, links
made absolute — subscribing gets you the writing, not a teaser and a click.

The engine is `lib/blog/` in [the repository](https://github.com/tsvb/goose-index),
tests included. The authoring guide is `docs/BLOG.md`.

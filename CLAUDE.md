# Project notes for Claude

## The database in .env is PRODUCTION

`DATABASE_URL` in `.env` points at **Neon — the live database**. `npm run db:migrate`,
`npm run sync` and every `import-*` script write **straight to production** from a laptop.
There is no local database in the loop unless you deliberately put one there.

A handoff doc used to claim the opposite ("local is a different database; local runs do not
touch prod"). It was wrong, and that is the belief that loses a database. The write scripts
now print their target host before they touch anything — trust that line, not a doc.

To work against a local database instead:

```bash
npm run db:up                                   # starts Postgres in docker
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' npm run sync
```

## Copy and voice

This site's job is to tell the truth about a dataset. Copy that overstates what the
numbers support is a **bug**, not a matter of taste — treat it like one.

Six rules, each learned by breaking it:

1. **Say what a thing is, not what it feels like.** No benefit-speak, no adjectives doing
   the work of facts.
   _"The full immersive edition" → "Charts, themes, motion."_

2. **Never claim something the data can contradict.** Headings ask; the chart answers. A
   heading that states a finding will be refuted the moment the data moves.
   _"Never miss a Sunday show?" → "Which night runs hottest?"_ (The answer turned out to be
   Monday, and the chart underneath was calling the heading a liar.)

3. **A claim never travels without its evidence.** If a reading rests on a thin sample, say
   so in the same breath — and give the chart a channel for it.
   _"Monday runs loosest — but on 25 shows, against 221 on a Saturday."_

4. **Don't claim what isn't yours alone.** A differentiator that every variant shares is not
   a differentiator.
   _1.0 was sold as "machine-readable" — but JSON-LD ships from the root layout on all three
   editions._

5. **Compute findings; never hard-code them.** The nightly sync can invert any fact. If copy
   names the jammiest night or the longest gap, it must derive it at render time.

6. **Name the thing accurately, then stop.** Drop jargon that doesn't describe what's there.
   _"Flow-state matrix" was never a matrix → "The segue lines."_

The same applies to docs: a number in the README goes stale every night the sync runs, so
give it the date it was taken or point at the live page. A finished to-do list left looking
unfinished is the same lie in a different file.

And to blog posts: everything in `content/blog/` is site copy and follows these rules.
Posts are parsed by the bespoke engine in `lib/blog/` (grammar + workflow documented in
[`docs/BLOG.md`](docs/BLOG.md)); CI parses every post, so a malformed one fails the build,
not a page.

## Charts

The statistics pages deliberately avoid a generic chart component. The rules — each question
gets the form its number actually is; colour means exactly one thing per section; a claim
never travels without its evidence — are written up under **"How the charts work"** in
[`README.md`](README.md). Read it before changing a chart; breaking one of those rules is a
bug even when it renders. (Kept there rather than repeated here, so the two can't drift.)

## Tooling preferences

- **Prefer Homebrew over npm for installing CLI tools.** When a global/system
  command-line tool is needed (e.g. the Vercel CLI), suggest `brew install …`
  rather than `npm install -g …`. This is about global tooling only — the
  project's own dependencies and `npm run` scripts in `package.json` still use
  npm as normal.

# /listen-links — explain the Listen buttons and the applenugs: scheme

**Date:** 2026-08-18
**Status:** Approved (design)
**Depends on:** [`2026-08-18-nugs-web-links-design.md`](2026-08-18-nugs-web-links-design.md).
That spec changes what the buttons do; this page describes what they do. Build it second, or
it will be rewritten.

## Problem

Show pages carry four affordances with no explanation anywhere on the site: `◈ Bandcamp`,
`▷ Listen on nugs`, `▷ Watch`, a `▷` on each setlist row, and (after the companion spec)
"Open on nugs.net". Three of them hand off to a custom URL scheme most visitors have never
heard of.

A visitor who clicks Listen either lands in a Mac app they may not have installed, or gets
bounced somewhere else entirely after a ~1.2s pause. Nothing tells them what happened, what
they need, or why an empty result is not a broken link.

The only existing write-up is `docs/integrations/applenugs-deeplink.md`, which is
developer-to-developer and lives in the repo, not on the site.

## Constraints discovered

- **The iPhone app is personal-install only.** No App Store build, no TestFlight
  (`tsvb/applenugs` README). The page must not imply a phone download exists. For most
  visitors on a phone, a Listen click will not open the app.
- **The index holds no nugs catalog data by design**, so it cannot know whether a given night
  is on nugs — only whether we resolved a container for it. An empty result means nugs doesn't
  have that night, not that the link broke, and the page has to say so in those words.
- **There is no per-track web route** on play.nugs.net. The `▷` row button starts the *app* at
  a song; a nugs.net web link can only reach the show. This asymmetry needs explaining.
- **`play.nugs.net` requires a login.** Whether sign-in returns you to the show is unverified
  and must not be claimed.
- **Three experiences.** `minimal` renders documents (`Doc` / `Breadcrumb` / `DocSection`);
  `functional` and `fancy` share the styled path, as in `app/on-this-day/page.tsx`.
- **Tests render with `renderToStaticMarkup`**, so page content must live in a component that
  takes data as props and touches no database.

## Approved design

### Route and name

`/listen-links`, titled **"How the listen links work"**, with the footer using the same phrase.
Not `/listen` — the site plays nothing, and the name would promise a player that isn't there.

### Content

**Fan-facing, in order:**

1. **The buttons.** `◈ Bandcamp` buys the night from the band; `▷ Listen on nugs` and `▷ Watch`
   hand the show to AppleNugs; `Open on nugs.net` opens the show in the nugs web player; the
   `▷` on a setlist row starts the show at that song. Bandcamp is described first, for the same
   reason it renders first — it is the one that pays the band.
2. **What a click does.** The browser is handed `applenugs://…`. If AppleNugs is installed it
   opens and resolves artist + date + venue against nugs. If nothing claims the link in about a
   second and you are still on the page, you are sent to nugs.net instead.
3. **What you need.** A nugs.net subscription — these buttons open what the subscription already
   gives you and nothing more. AppleNugs for macOS, linked to its release. And the iPhone line
   stated plainly: personal-install only, no App Store, no TestFlight.
4. **What it can't do.** This index holds no nugs catalog data. A night listed here isn't
   necessarily on nugs; landing on an empty result means nugs doesn't have that night. Two-show
   days are separated by venue, and where that isn't enough the app asks. A web link reaches a
   show, never a single song.
5. **Try it** — the live example (below).

**Developer section**, below the fold — `<details>` in the styled experiences, a plain section
in `minimal`: the URL grammar, the parameter table, the `%20`-not-`+` rule *with* its reason
(Swift's `URLComponents` does not decode `+` to a space, so a `+` reaches the app literally),
the three-tier title matching, and a pointer to `tsvb/applenugs`.

### Examples

The page pulls the most recent past show via `getRecentShows(1)`, and one real song title from
its setlist, then builds **every example URL by calling the real helpers** — `nugsShowHref`,
`nugsTrackHref`, `nugsWebHref`, `nugsWebFallback`. Nothing is retyped as a string literal, so
the URL printed on the page is the URL the buttons emit and cannot drift when the scheme changes.

The try-it control is a real `NugsLink` with the real fallback. It tells the reader whether the
handoff works **on their machine** — and the page says exactly that, because it proves the
handoff, not that the show is on nugs.

### Structure

- `app/listen-links/page.tsx` — server component: queries, `getExperience()`, `metadata` with a
  canonical URL.
- `app/_components/listen-links.tsx` — takes `{ experience, example }` and renders. No fetching,
  so `renderToStaticMarkup` drives it in all three experiences with no database.
- `app/_components/site-footer.tsx` — the link in all three footers. Fancy puts it in the
  **Source** column (it explains site behaviour; it is not a browse destination), functional
  appends it to its single line, minimal gets a sentence.
- `app/sitemap.ts` — add `/listen-links` to the static route list.

### Degradation

An empty database renders the full explanation and omits the try-it block. No setlist drops the
track example. Nothing invents a date, and nothing throws.

## Testing

`app/_components/listen-links.test.tsx` via `renderToStaticMarkup`: renders in each experience;
the printed URL equals what `nugsShowHref` returns for the same input; the video example carries
`media=video`; a space in a venue encodes as `%20` and never `+`; the no-show and no-setlist
paths render without the try-it block. Plus a footer assertion in `site-footer.test.tsx` and the
route in `sitemap.test.ts`.

## Out of scope

- Changes to `NugsLink`, `lib/nugs.ts`, or the buttons themselves — all of that belongs to the
  companion spec.
- An inline "what's this?" beside the buttons on show pages. Entry is footer-only; the buttons
  row already carries three or four controls in three experiences.
- Install detection beyond the ~1.2s race `NugsLink` already runs.

## Open questions

- Coverage — what share of shows resolve to a nugs container. Worth stating on the page once the
  first import has run, and per copy rule 5 it must be **computed at render time**, never
  hard-coded.

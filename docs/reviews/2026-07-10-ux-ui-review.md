# UX/UI Review — Goose Index

**Date:** 2026-07-10 · **Scope:** the whole site, all three experience modes, all three fancy themes, desktop + mobile

## How this review was done

The site was run locally against a realistic seeded database (392 shows, 6,459
performances, 2016–2026, built from the real elgoose song/venue fixtures). Evidence
was gathered from:

- **78 full-page screenshots** — 15 page types × fancy-dark, plus the 6 core pages
  across fancy-light, fancy-pod, functional, and minimal, at 1440px and 390px.
- **axe-core scans** of every page type in fancy-dark, functional, and minimal.
- **Playwright interaction tests** — keyboard traversal, popover behavior, touch
  simulation, scroll/overflow measurement at 390×844.
- **Code reading** of every page and component, with computed WCAG contrast ratios
  for every token in every theme.
- Ten parallel review passes (IA/navigation, visual design, responsive, accessibility,
  interaction, content/copy, browse pages, stats/songs pages, experience modes,
  home/search) whose findings were then **independently re-verified**: every high/medium
  claim below was reproduced against the running site or the code before inclusion.
  One claim was refuted in verification and removed (horizontal stat tables *are*
  keyboard-scrollable).

Caveats: seed data is synthetic (counts/dates are plausible, not real); the live-show
banner and auto-refresh were reviewed in code only (no show was in its ET window during
testing); dev-mode rendering, the Next.js dev badge, and dev timing were ignored.

---

## Verdict

This is a genuinely designed product, not a template. The "Almanac" concept — warm
ledger typography, mono eyebrows, hairline rules, grain, stage-glow, disciplined
gold/sage/ember accent roles — is executed consistently across all fifteen page types,
and the three experience modes are a real feature, each taking its conceit seriously.
URL design, cross-linking between entities, and the show-detail setlist page are
excellent. **Keep all of this.**

The problems cluster in four places:

1. **Search is the front door and it can't find songs** — the single most common
   query type for a setlist site.
2. **The phone experience of data-dense pages breaks down** — the song page and song
   index are effectively unusable at 390px for reading stats.
3. **A handful of color tokens fail WCAG AA at scale** — one token (`--faint`)
   accounts for the large majority of ~2,900 serious axe violations; light and
   functional themes have systemic failures. Pod proves the team knows how to do
   this right.
4. **The site never shows its work** — no link previews (no OG tags, no favicon), no
   loading states, no methodology notes, no glossary for the jargon its own UI leans on.

None of these require redesign. Nearly everything below is a targeted fix inside the
existing system.

---

## What's working (do not regress)

- **IA and URLs.** One consistent six-section nav across all experiences; every list
  state (year/tour/sort/page) lives in the URL and is shareable/back-button-safe
  (`lib/shows-url.ts`); `/shows/2025-06-25?n=2`, `/songs/jive-ii` are human-readable.
- **Show detail** is the best page: segue thread rail, flame jam markers, per-set
  counts/durations, italic cover attributions, prev/next-night cards with venue names,
  per-show elgoose attribution. The setlist reads like a score.
- **Entity graph round-trips.** Show ↔ song ↔ venue ↔ tour are each one click in both
  directions.
- **"Tonight's show →" jump** on `/shows` preserves filters and anchors to the row —
  exactly right for the at-the-venue use case.
- **Themes are designed, not inverted.** Light re-derives the golds for cream paper;
  pod (graphite + banana yellow) is its own object and is the only theme that passes
  AA on every token — with a CSS comment proving it was engineered deliberately
  (`app/globals.css:59`).
- **Minimal mode is real** — semantic tables, breadcrumbs, an inspectable schema.org
  block, 155KB vs 277KB HTML on `/shows` — a genuine low-bandwidth/AT escape hatch.
- **Accessibility bones exist**: global gold `:focus-visible` ring that never fires on
  mouse, `prefers-reduced-motion` fallbacks, one `Svg` wrapper hardcoding
  `aria-hidden` on all decorative icons, a settings popover with correct focus
  management (Escape restores trigger focus).
- **Desktop data tables** — tabular numerals, right-aligned numbers, pinned identity
  column, inline sparklines — are excellent at 1440px.
- The **404 page** stays in voice ("Off the setlist") with real recovery paths.

---

## P0 — Fix first

### 1. Global search cannot find songs
Every search entry point hits a backend that queries only shows, venues, and tours
(`app/search/page.tsx:84-88`, `lib/queries/shows.ts:290`). `/search?q=jive ii` returns
"No results" while `/songs/jive-ii` exists — and a working song filter already ships at
`/songs?q=`. The empty state ("try a date, a venue name, or a city") never mentions
songs, so fans conclude the song isn't indexed.
**Fix:** add a `searchSongs` query (name ILIKE, ordered by play count), render a Songs
group on `/search` in all three experiences, update placeholders, and make the
no-results state link to `/songs?q=<term>`.

### 2. Prev/next show navigation breaks on multi-show dates
`getShowNeighbors` never selects `showOrder`, and all four call sites build
`showHref(date)` without it (`app/shows/[date]/page.tsx:89,94,159,162`). On a two-show
date, "Next night" links back to the same page (show 1); walking forward skips shows
2..n entirely. Verified by link extraction on a seeded three-show date.
**Fix:** select `showOrder` in the neighbor query, pass it to `showHref`, and relabel
"Later/Earlier show this day" when the neighbor shares the date.

### 3. Song page blows out the mobile viewport — stats unreachable
At 390px, `document.scrollWidth` measures 786px on `/songs/jive-ii`: the `nowrap`
performance table's min-content width propagates through the `1fr` grid track
(`.song-cols` at `app/globals.css:426`), `body { overflow-x: hidden }` clips the
overflow, the inner scroller never activates, and the pinned Date column never sticks.
Charts are half-clipped; Set/Gap/Time columns are unreachable; the "swipe →" hint
promises behavior that doesn't happen.
**Fix:** `grid-template-columns: minmax(0, 1fr)` in the ≤820px rule (or `min-width: 0`
on grid children); verify `scrollWidth === 390` and that the pinned column sticks.

### 4. Pinned song column eats the mobile scroll viewport on /songs and stats cuts
`td.song-pin` has `min-width: 120px` but no max (`app/globals.css:460`), so long
titles grow it to 294–340px of a 348px scroll area — an 8–54px data window. On
"Most Played," the play count is invisible at rest; on `/songs`, no stat column is
visible at any swipe position. The pages read as bare name lists on a phone.
**Fix:** cap the pin (`max-width: 44vw` + ellipsis + full name in `title`/`aria-label`)
at ≤640px, surface the key stat (Played) inside the pinned cell on small screens, move
the swipe hint above the table.

### 5. The "Gaps & returns" sparkline is blank for exactly the songs fans look up
One flex `<i>` per performance with `gap: 2px` in a ~360px container
(`app/globals.css:441`, `song/charts.tsx:35`): above ~180 performances the gaps alone
exceed the container and every bar computes to 0px — Jive II (284 plays) renders a
completely empty 52px band with an orphaned legend, in all three themes. Two-play
songs render a half-container monolith.
**Fix:** render as SVG with computed widths, or bucket to ≤150 bars and drop the
inter-bar gap above a threshold; cap bar width for low-count songs.

### 6. Nugs Listen/Watch links are invisible in the light theme
`.nugs-show`/`.nugs-track` hardcode dark-palette hexes (`app/globals.css:479-499`)
with no `[data-theme="light"]` override: #8fc6ee on cream = **1.53:1**. The primary
listen actions on the show page read as disabled ghosts in the theme daylight users
will pick.
**Fix:** tokenize the nugs blues per `[data-theme]`, mirroring the existing functional
and minimal overrides.

### 7. `--faint` and the light/functional accent tokens fail WCAG AA at scale
Computed ratios: dark `--faint` #897a60 = 4.49:1 on bg / **4.24:1 on surface** (just
under AA, on thousands of 0.55–0.72rem labels — this single token produces most of the
~2,900 serious axe nodes: 2,230 on `/songs` alone); light `--faint` = **2.88:1**;
light gold/gold-soft/ember = 3.07–3.81:1; functional `--faint` 2.72:1, green `--sage`
2.53:1, `--ember` 1.75:1. Pod passes everything (5.28:1 faint) — apply the same
process to the other themes.
**Fix:** nudge ~6 hex values (dark faint → ~#94856b; light faint → ~#7a684c, gold →
~#99621a, ember → ~#a5511c; functional faint → ~#68798a, sage → ~#3f7d14). The warm
palette survives; re-run axe to confirm.

### 8. Setlist footnotes are hover-only in fancy and dropped in functional/minimal
Footnotes (debuts, guests, teases — ~6% of performances) render only as a `°` with a
`title` tooltip on a non-focusable span (`setlist/fancy.tsx:76-80`): unreachable on
touch, keyboard, and most screen readers. Functional mode renders no footnotes *or*
jamchart notes; minimal lists only jamchart notes.
**Fix:** numbered visible endnotes per set (the jamchart-notes list pattern already
exists at `fancy.tsx:96`); add footnotes to minimal's list and a notes column/row to
functional.

### 9. No favicon, no social cards — the site is invisible when shared
`/favicon.ico` and `/apple-touch-icon.png` 404 (the console errors on every page load);
no icon files exist under `app/`. `generateMetadata` emits title/description only —
**zero Open Graph or Twitter tags site-wide**. Links pasted into Discord, Reddit, or
iMessage — the primary distribution channels for a fan site — unfurl as bare URLs.
**Fix:** add `app/icon.svg` (the Feather mark) + `apple-icon.png`; add `openGraph`/
`twitter` blocks to the metadata template, and per-show/song OG descriptions (venue,
date, song count). Consider generated OG images later; tags alone capture most of the
value.

---

## P1 — Real friction, fix soon

### Search & discovery
- **Results are silently truncated** at 24 shows / 12 venues / 8 tours with no counts
  and no "view all" (`app/search/page.tsx:84-88`). `/search?q=2024` shows 24 of 52
  shows with no hint that `/years/2024` exists. Show counts per group header; pin a
  "Year 2024 →" result for 4-digit queries.
- **The search box never echoes the query** — on `/search?q=rise` the page's own box
  is empty (`search-box.tsx:9` seeds `useState("")`). Seed from the URL.
- **Only ISO dates match.** `8/7/2024` and `aug 7 2024` return nothing
  (`show_date::text ilike`, `lib/queries/shows.ts:294`). Normalize common date shapes
  server-side.
- **`/songs` has no name filter box** even though the backend supports `?q=` and every
  sort link carefully preserves it (`app/songs/page.tsx:24,91`). Add the input.
- **Minimal-mode `/search` has no form** — it tells users to edit the address bar. A
  plain GET form is exactly in that mode's spirit.
- **`/years/[year]` pages are orphans**: no inbound links, absent from `sitemap.ts`
  (as are venue/tour details), and `/years` 404s. Link year headers to them and fix
  the sitemap.
- **Tonight's show appears as a stale "no setlist" card** under "Freshly logged"
  instead of a Tonight banner (`getRecentShows` includes today). Hoist a "Tonight"
  card near the hero when a show is dated today; it becomes the live-setlist entry
  point on show nights.

### Navigation & wayfinding
- **Desktop nav has no active state** (mobile drawer does). Add `aria-current="page"`
  + gold text across experiences (`site-header.tsx:31-37`).
- **Back affordances are inconsistent**: show detail gets "← All shows," song detail
  gets a breadcrumb, venue/tour/year detail get nothing. Adopt one pattern (linked
  eyebrow) site-wide.
- **`/shows` defaults to oldest-first**, burying current setlists on page 8. Default
  to newest-first; reword the sort toggle as an action.
- **The jump-to-row `:target` flash never plays on client-side navigation** — its
  primary path (Next `<Link>` doesn't retrigger `:target`). Add a small hashchange
  handler; keep `:target` as no-JS fallback.

### Mobile & responsive
- **Functional-mode mobile menu floats 16px below its 48px header** (hardcoded
  `top-16`, `mobile-nav.tsx:51,53`) with a see-through gap, and the hamburger is
  near-invisible on the blue appbar. Derive the offset from the header; extend the
  functional white-icon override to the menu button.
- **The mobile nav sheet** ignores Escape (the settings popover handles it — reuse),
  lets the background scroll, and clips items in landscape (no max-height/scroll).
- **Functional setlist table overflows 390px with no scroll wrapper** — the Listen
  column sits past the viewport edge. Wrap in the existing ScrollTable.
- **"Dusted Off" pills fracture across lines** on mobile (`setlist/fancy.tsx:72`,
  `.w2-badge`). `whitespace-nowrap inline-block`.
- **Minimal tables collide columns at 390px** — headers read "PLAYEDGAPLAST", a gap of
  2 merges into a date as "22026-06-06". Add a left gutter to `.num` cells.

### Accessibility (beyond P0 tokens)
- **No skip link** — 9+ tab stops through the sticky header on every page. First
  child of `<body>`, gold focus ring, target `<main>`.
- **Heading structure**: functional show pages have *zero* headings (axe:
  page-has-heading-one); fancy skips h1→h3 on show/song pages. Fix element choice,
  keep classes.
- **Per-track ▷ listen links are keyboard-unreachable** (`visibility: hidden` until
  row hover, no `:focus-within` rule, `globals.css:496`) and unlabeled. Use
  `opacity: 0` + reveal on `:focus-within`; add aria-labels.
- **Charts have no text alternative**: `role="img"` on the plays-per-year chart
  flattens its own text labels; sparkline values live in `title` attrs on
  non-focusable `<i>` elements. Remove the role; give sparklines a summary
  `aria-label` ("longest gap 150 shows, 4 returns").
- **Focus ring is invisible on the functional appbar** (blue-on-blue, 1.1–1.3:1).
  White outline override inside `.w2-appbar`.
- **`NugsLink` hijacks modifier-clicks** — cmd/ctrl+click redirects the *current* tab
  to the fallback (`nugs-link.tsx:14-26`, no metaKey guard). Bail on modified clicks.

### Tables, stats & data honesty
- **No table header is sortable anywhere**, and stats-cut tables ship with no sort
  controls at all — while the `/songs` header copy promises "sort the whole catalog
  any way you like." Make `<th>` link to the existing `?sort=` URLs with a caret.
- **Plays-per-year charts omit zero-play years**, so a 2021→2026 drought reads as two
  adjacent bars (`lib/queries/songs.ts:280`). Zero-fill debut→current year.
- **"Most overdue" on `/songs` contradicts `/stats/current-gaps`** — the `/songs` sort
  surfaces one-off retired covers (Feliz Navidad) because the ≥5-plays rule is a
  tiebreaker, not a filter (`songs.ts:131`). Align the criteria and state them.
- **`/stats/debuts` renders an unlabeled chart and list** (and the chart's hardcoded
  aria-label says "Plays per year" — wrong here). Add headings; make the label a prop.
- **No stats cut states its methodology or truncation** (rarities criteria, top-100
  slice, 15-per-bucket set stats). One-line footnote per cut + a cut-switcher row.
- **`/songs` ships 4.1MB of HTML** (605 rows × ~11 sparkline elements each). Paginate
  like `/shows`, or drop the sparkline column at ≤640px.

### Content & feedback
- **The jargon is never explained** — Gap, Rotation, Dusted Off, ★ JAM, `›` segue
  carry the site's meaning and get no tooltip, legend, or glossary anywhere. One-line
  legend under setlists + `title`/`abbr` on table headers; consider a short "How to
  read the Index" page.
- **Zero loading states** while every route is `force-dynamic` and blocks on Postgres.
  Add `loading.tsx` ledger skeletons for shows/songs/stats/search.
- **Never-played songs render a wall of zeros** and an empty table with a "swipe for
  more" hint. Purpose-written empty state in the almanac voice.
- **The nugs fallback dumps users on play.nugs.net's homepage** (the function comment
  admits it should target the show) and Listen/Watch buttons render on shows with
  "0 songs · 0 sets." Deep-link a search URL; hide/replace buttons when there's
  nothing to play.
- **Experience modes are undiscoverable** — an unlabeled gear is the only entry to the
  site's most distinctive feature, and "3.0/2.0/1.0" is never decoded. A footer line
  ("You're reading the 3.0 edition — switch to 2.0 dense or 1.0 plain") opening the
  same switcher would fix both.

### Underdesigned pages (relative to the rest)
- **The Stats hub** is five bare title cards with a hole in the grid — the only page
  with no data on a site about data. Pull a headline stat per cut ("Most Played —
  Jive II · 284").
- **The Venues index** is a flat ~15,000px single-column list of 191 rows with ~800px
  of dead space per row. Filter box + state/letter grouping + denser layout.
- **ShowRow is context-blind** — venue pages repeat the venue name as the title of
  every row; tour pages repeat the tour eyebrow. Add `hideVenue`/`hideTour` props and
  promote the date on venue pages.

---

## P2 — Polish (curated)

- Home's "Browse the record" funnels omit Songs and Stats — the two sections stat
  fans came for.
- "Also this day" chips say only "Show 2" — add the venue name.
- Two different show totals with no qualifier (home hero counts played shows, `/shows`
  counts all).
- Song-page meta descriptions emit "played X 0 times since ?" and "1 times".
- Filter pills' hover *reduces* border contrast (reads backwards).
- Song-detail H1 uses weight 800 against the site's 460 display voice.
- Sub-10px mono microcopy (chart axes, swipe hints) is below comfortable legibility.
- Desktop nav hides behind the hamburger until 1024px — tablets have room at 768px.
- Settings popover: initial focus lands on the first button (not the current choice),
  and focus drops after switching experience; no pending state during the refresh.
- `:target` flash isn't gated behind `prefers-reduced-motion`.
- Live polling continues while the tab is hidden (`live-refresh.tsx`) — pause on
  `visibilitychange`.
- Casing drift: header "On This Day" vs footer "On this day"; minimal `/songs` sort
  row has a dangling "·".
- The 404 ignores experience modes (fancy hero leaks into minimal); date-shaped 404
  URLs could offer "browse shows near this date."
- On desktop, the song page's left rail empties after the first screenful while the
  performance table runs on for thousands of pixels — consider `position: sticky` on
  the rail or grouping the history by year.
- Modes can't be linked/shared (cookie-only). A `?exp=` override that sets the cookie
  would let fans share the 2.0/1.0 views.
- Hero stat "613 unique songs" counts 8 never-played songs; "605 performed" is the
  honest number (or relabel "in the songbook").

---

## Suggested sequencing

| Order | Theme | Items |
|---|---|---|
| 1 | Two-line CSS fixes with outsized reach | P0-3 grid fix, P0-4 pin cap, P0-7 token nudges, P0-6 nugs light tokens, Dusted-Off nowrap |
| 2 | Search credibility | P0-1 songs in search, query echo, truncation counts, date normalization, `/songs` filter box |
| 3 | Correctness bugs | P0-2 neighbor links, NugsLink modifier guard, functional menu offset, P0-5 sparkline rewrite |
| 4 | Reach & sharing | P0-9 favicon + OG tags, sitemap additions, `/years` links |
| 5 | A11y sweep | skip link, headings, footnotes-as-endnotes, focus-reveal for ▷, chart alternatives |
| 6 | Feedback & explanation | loading skeletons, glossary/legends, methodology notes, empty states, Tonight banner |
| 7 | Page upgrades | stats hub stats, venues index, ShowRow context, `/songs` pagination |

## Appendix: measured contrast ratios (text tokens on `--bg` / `--surface`)

| Token | Dark | Light | Pod | Functional | Minimal |
|---|---|---|---|---|---|
| `--muted` | 7.79 / 7.37 | 5.40 / 5.99 | 6.71 / 6.10 | 4.32 / 4.98 | 8.86 |
| `--faint` | **4.49 / 4.24** | **2.88 / 3.19** | 5.28 / 4.80 | **2.72 / 3.13** | 5.41 |
| `--gold` | 9.41 / 8.89 | **3.07 / 3.41** | 11.85 / 10.78 | **3.36 / 3.87** | 18.42 |
| `--gold-soft` | 6.36 / 6.01 | **3.81 / 4.22** | 9.10 / 8.28 | **3.81 / 4.39** | 18.42 |
| `--sage` | 8.92 / 8.43 | 4.27 / 4.73 | 8.07 / 7.34 | **2.53 / 2.92** | 7.54 |
| `--ember` | 7.07 / 6.69 | **3.53 / 3.91** | 7.85 / 7.14 | **1.75 / 2.02** | 18.42 |

Bold = below WCAG AA (4.5:1) for the small text these tokens are used on. Pod and
minimal pass everywhere; pod's `--faint` comment (`globals.css:59`) shows the standard
the other themes should be brought to.

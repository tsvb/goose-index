# Pen & Instrument — a de-carded UI for Goose Index

- **Date:** 2026-08-16
- **Status:** approved in brainstorm; awaiting implementation plan
- **Branch:** `redesign/pen-and-instrument`
- **Mockups:** `.superpowers/brainstorm/49302-1786922294/content/` (gitignored; `pen-and-instrument.html` is the assembled language)

## The problem

The 3.0 edition is cards all the way down: card grids (`ShowCard`), card stacks
(`BrowseLink`), card panels (`.surface-card`), cards inside cards (the date chip in a row
in a panel), card-shaped prev/next, pill-shaped controls. Two failures, named during
brainstorm:

1. **Sameness** — every kind of content (a show, a link, a stat, a list) gets the same
   generic rounded box. The charts already refuse this ("each question gets the form its
   number is"); the layout never did.
2. **Genericness** — rounded bordered boxes with hover-lift are the house style of every
   SaaS dashboard. A site named *Goose Index* should look like an index, not a dashboard.

## The idea

Everything on a page is drawn by one of two hands:

- **The instrument records.** System type, tabular numerals, crisp geometry, tick rulers,
  one yellow hand. Braun-clock DNA: precise, functional, unornamented.
- **The pen annotates.** Graphite wobble — section rules, entry separators, circles,
  arrows, margin caveats. Grug DNA: unpolished, human, warm in manner rather than in
  color.

The page reads as a precision dial face that a human has written on. Cards are extinct:
no rounded containers, no borders-as-boxes, no shadows, no hover-lift, anywhere in 3.0.

The layout skeleton is **the Index** — reference-work forms instead of boxes (see
Vocabulary). This extends the charts' rule up to layout: each content kind gets the form
it actually is.

## Decisions made in brainstorm (with why)

| Decision | Choice | Why |
|---|---|---|
| Scope | 3.0 edition, sitewide; every surface fair game | 1.0 is already a document; 2.0 is deliberately period-styled |
| Skeleton | The Index (entries / contents / folio / figures) | The site's name and identity; no dashboard looks like this |
| Finish | "Pen everywhere" (D2), cooled | Chosen over pen-as-caveat-only (D3) and fully-plain (D1). The later Braun pass moved *chart geometry* from pen to instrument; the pen kept the page structure and the margins |
| Temperature | Cool: fog paper, blue-black ink, steel accent | User call after seeing warm cream version |
| Type | macOS system default only, `tabular-nums` for data | Grug spirit: use the font the cave already has; ship nothing |
| Data UI | Braun instruments: tick rulers, gauges, one yellow hand | User delegated the call, asked for Braun clock aesthetic massaged in |
| Editions | 3.0 replaced wholesale; 2.0's skin re-cut onto the new skeleton; 1.0 untouched | User call; see "Editions & themes" |

## Color and type

Each color keeps exactly one meaning — same discipline as the charts, where a color that
means two things is a bug.

| Token | Fog (light) | Slate (dark) | The one meaning |
|---|---|---|---|
| `--paper` | `#f3f5f7` | `#22262d` | the page |
| `--ink` | `#1f242b` | `#e8ecf1` | content |
| `--muted` / `--faint` | `#5d6672` / `#8b95a1` | `#aab3bd` / `#7e8894` | secondary / tertiary content |
| `--steel` | `#46708f` | `#7ba3c4` | the record's structure: dates, section leads, a chart's subject bar |
| `--hand` | `#d9a406` | `#f2b705` | **now and the reading**: the live dot, gauge pointers, today's mark, a chart's answer value |
| `--spruce` | `#47776b` | `#7fae9f` | links, only |
| `--pencil` | `#7b8590` | `#98a1ab` | the human margin: every pen stroke and pen note |
| `--line` / `--line-soft` | ink at 28% / 13% | ink at 30% / 14% | straight hairlines (instrument rules) |

Values above are the approved mockup values; implementation may tune them for WCAG AA
contrast but must keep the roles and the temperature.

- Hand yellow is the Braun second hand, and the successor of XL II's "one warm filament."
  It is brighter in the dark, like the real clocks. It is never text-only: a yellow mark
  always accompanies a written value, so color is never the sole carrier.
- Ember retires with the old palette. Setlist heat moves to ink weight plus explicit
  duration figures.
- Type: `-apple-system, system-ui, sans-serif` everywhere; `font-variant-numeric:
  tabular-nums` on all data. No display faces, no webfonts, nothing shipped.
- Voice: site chrome (headings, labels, nav, buttons, empty states) is lowercase.
  Authored content — venue names, song titles, notes, blog prose — keeps its own casing.
- Motion budget: the live dot may pulse; everything else is still. The `rise` entrance
  animation and all hover-lift/translate effects retire. `prefers-reduced-motion` stills
  the dot too.
- Hover affordance: whole-entry links show a hairline underline under their title on
  hover; inline prose links are spruce-underlined always. Nothing moves, nothing glows.

## The vocabulary (content kind → form)

| Content | Form |
|---|---|
| A show | A **ledger entry**: date (steel, tabular) · venue/location (ink) · count + notes link (faint/spruce). Whole row is the link. |
| A list of shows | A **ledger**: entries separated by pen rules (strong rule under the section head, faint rules between rows). No wrapper panel. |
| Browse targets | A **contents** list: lowercase label + live count per row. No icons in circles, no chips. |
| Prev/next | A **folio line**: `← aug 11 · the salt shed  ·  entry no. 823  ·  aug 14 · alpine valley →` |
| A stat | A **figure**: large tabular numeral over a lowercase label. Where the number lives on a scale, it gets a tick ruler or gauge with a yellow reading. |
| A chart | An **instrument**: crisp geometry on tick rulers; steel subject bar; yellow marks the answer; the **pen carries the caveat** (see below). |
| A timeline (career, tour, "the record") | A **tick ruler** with a yellow hand at now / at the marked point. |
| Bustouts, gaps, notable facts | **Computed pen margin notes** — pencil italic, sometimes with a pen arrow or circle. Never hard-coded (copy rule 5). |
| Setlist | Keeps its rail form, re-tempered: steel rail, ink songs, spruce links, pen for the show's notes. Segues stay instrument-precise (they are data). |
| Controls (filters, sort, pagination) | Underlined lowercase text; pagination as folio numbers. No pills, no rounded buttons. |
| Inputs (search) | A hairline-underlined field, no box. |
| Empty state | A nil sentence: `no shows match. —` No dashed boxes. |
| Live | Yellow dot + lowercase `live`/`tonight` in hand yellow; the live-refresh behavior is unchanged. |
| Notes/prose asides | Pen-ruled margin paragraphs (the "from the notes" treatment), not accent-bordered cards. |
| Loading | Plain pulse lines in `--line-soft`; no card-shaped skeletons. |

### The pen layer

- Pen strokes are small server-rendered SVG components: `PenRule`, `PenCircle`,
  `PenArrow`, plus `PenNote` (pencil italic text block).
- Wobble is **deterministic**: path parameters derive from a hash of a stable key (e.g.
  `"ledger-row-2"` or the show date), never from `Math.random()`. SSR output, hydration,
  and test snapshots stay reproducible.
- The pen is the caveat channel the copy rules demand: chart caveats, thin-sample
  warnings, and computed margin notes are pen; congratulating copy is not a thing the pen
  does.
- Density guidance: the pen draws structure (rules) freely, but circles/arrows appear at
  most once per section — emphasis that is everywhere is emphasis nowhere.
- Who wobbles: **navigational ledgers get pen rules; data tables and instruments get
  straight hairlines.** A list you scan to go somewhere is the human's index; a table or
  chart you read for values is the machine's record.

### The instruments

- Axes and scales are tick rulers: fine ticks, majors labeled, faint. Baselines are ink.
- One yellow reading per instrument, always paired with its written value.
- Bars: subject in steel, field in `--line-soft`. No gradients, no rounded bars.
- Existing chart forms on /stats keep their question-first shapes; they are re-skinned to
  this system, not redesigned. "How the charts work" in README gains the pen/yellow/steel
  role definitions.

## Page by page

- **Home** — masthead (lowercase wordmark, text nav, tagline) over a pen rule; figures
  row + "the record" year-ruler instrument with yellow hand at now; tonight entry (hand
  yellow) when live; on-this-day ledger; latest-shows ledger; contents block. The almanac
  nameplate, stage-glow, hero animation, and all card grids retire.
- **/shows** — text filters (year, tour) as underlined words; the full ledger; folio
  pagination.
- **/shows/[date]** — folio header (date, entry no., prev/next); venue/location line;
  the setlist rail; pen notes; nugs/listen links as text links; neighbor cards → folio
  footer.
- **/songs** — the sortable table, restyled plain: hairlines, tabular columns, underlined
  sort headers.
- **/songs/[slug]** — figures (times played, first/last, longest gap) with rulers where
  scaled; career chart re-instrumented; performances ledger.
- **/venues, /tours, /years** — contents + ledgers; venue map re-tempered to the cool
  palette; tour timeline becomes a tick ruler.
- **/stats** — section nav as underlined text (pills retire); every chart re-skinned as
  an instrument with pen caveats.
- **/search** — underlined input; results as ledgers grouped by kind.
- **/on-this-day** — an almanac ledger grouped by year.
- **/blog** — index becomes a contents list; post prose re-tempered (system font, new
  tokens); the blog grammar and engine are untouched.
- **404 / loading / error** — nil sentences and pulse lines.

## Editions and themes

- **3.0** becomes pen & instrument, wholesale. Fog and slate follow
  `prefers-color-scheme`, with an explicit override in the settings gear. The five themes
  — XL II, Dark, Light, Pod, and Registrar — retire to git history, and their CSS,
  settings entries, and the theme cookie go with them. (Registrar merged 2026-08; it is
  the freshest casualty and the user has signed off by name.)
- **2.0** keeps its glossy Web 2.0 identity, re-cut onto the new skeleton: striped
  tables, gradient masthead, classic blue links. Period-true — Web 2.0 loved a striped
  table. Its skin CSS is rewritten against the new markup.
- **1.0** is untouched (it already renders its own document markup).
- The edition switcher and cookie machinery survive; the settings panel shrinks to
  edition + fog/slate/auto.

## Code plan (shape, not sequence)

- `app/globals.css` rebuilt around the new tokens; `.surface-card`, theme blocks, pill
  and card utilities deleted.
- New `app/_components/pen.tsx` (PenRule/PenCircle/PenArrow/PenNote) and
  `app/_components/instrument.tsx` (TickRuler, Gauge, chart axis helpers).
- Renames to match forms: `show-card.tsx` → `show-entry.tsx` (ShowCard → ShowEntry,
  ShowRow → LedgerRow), BrowseLink → ContentsRow, SectionHeader → SectionRule, etc.
- `lib/theme.ts` reduced to fog/slate/auto; settings panel and layout theme plumbing
  simplified.
- Setlist components re-tempered; `data-experience="functional"` (2.0) selectors
  rewritten against the new markup.
- Untouched: `lib/queries/`, `lib/sync/`, `db/`, JSON-LD, sitemaps, RSS, the blog
  engine, the 1.0 Doc components' structure.

## Verification

- Every component change lands with its updated `.test.tsx`; suite stays green (597
  tests at baseline).
- Playwright screenshot pass (per project memory: drive Chrome, actually look) over
  home, /shows, a show page, /songs, /stats in fog and slate, plus 2.0 and 1.0 smoke
  screenshots.
- Copy audit against the six CLAUDE.md rules on every touched page; all pen notes and
  figures computed at render time.
- Contrast check: steel/faint/pencil on fog and slate at AA for their text sizes; hand
  yellow never the sole carrier of information.

## Out of scope

- Data layer, sync, and query changes.
- Chart *forms* on /stats (their question-shapes stay; only the skin changes).
- The blog grammar/engine and post content.
- New features; this is a re-clothing of what exists.

## Resolved-at-implementation

- Final hex tuning for AA contrast.
- Mobile nav form (text list under the masthead; no drawer cards).
- Exact pen-stroke path generator (seeded; a few hand-authored path templates are fine).

# Minimal as an Early-Web Document (addendum)

_Date: 2026-06-28 · Status: proposed · Builds on `2026-06-27-experience-modes-divergence.md`_

## Decision (confirmed with Tim)

Minimal becomes a **meticulously organized early-web HTML document on every page**
— "tight and clean, organized by the likes of John Siracusa, true to form."
Not just chrome-stripped: a real document with semantic structure, data in
tables, and footnotes.

## Minimal document design system

- **Type:** system serif (`Georgia, "Times New Roman", serif`) — no webfont.
  Monospace (`ui-monospace`) for figures/times.
- **Links:** classic underlined blue (`#13418a`).
- **Layout:** a single constrained document column (~600px measure), left-aligned,
  generous but tight. Section headers are small uppercase `<h2>` with a hairline
  underline. Hairline `1px #ededed`/`#cfcfcf` rules; no cards, grids, glow, or
  app-chrome.
- **Data:** rendered as `<table>` — a 2-column **facts table** at the top of detail
  pages; **data tables** for lists (shows, venues, tours).
- **Footnotes:** jam-chart notes become numbered footnotes with superscript refs
  in the setlist (the Siracusa touch).
- **Chrome:** minimal header = a serif `›` breadcrumb/nav row; footer = one serif
  line. (Restyle the existing minimal header/footer.)

## Reusable primitives (`app/_components/doc/`)

Minimal-only, semantic, used across pages so per-page bodies stay tiny:

- `Breadcrumb({ trail: { href?, label }[] })` → `a › a › text`.
- `MetaTable({ rows: { k: string; v: ReactNode }[] })` → 2-col facts table.
- `ShowTable({ shows: ShowSummary[] })` → table: Date · Venue · Location · Songs,
  each row linking to the show. Used by /shows, /years, /venues/[id], /tours/[id],
  /on-this-day, /search, and home "recent".
- `EntityTable({ rows: { href, name, sub?, count? }[] })` → table for venues/tours
  lists.
- `DocSection({ title, children })` → `<h2>` + content.
- `DocShell`/measure: a `<div>` wrapper applying the document column. (Or a global
  CSS rule on a `.doc` class.)

## Per-page Minimal bodies (branch `experience === "minimal"`)

Each page keeps its current fancy/functional body; Minimal renders a document body
from the primitives using the data the page already fetches:

- **show detail** — breadcrumb + `<h1>` + facts `MetaTable` + per-set setlist
  **tables** (`#`, song, segue, time, jam footnote ref) + a "Jam notes" footnotes
  list. (Replaces the current `<dl>`/`<ol>` minimal show header + setlist.)
- **/shows, /years/[year], /on-this-day, /search** — breadcrumb + `<h1>` + (year
  filter / sort as plain links where present) + `ShowTable` + plain pagination links.
- **/venues, /tours** — breadcrumb + `<h1>` + `EntityTable`.
- **/venues/[id], /tours/[id]** — breadcrumb + `<h1>` + `MetaTable` + `ShowTable`.
- **home (`/`)** — a document: `<h1>` Goose Almanac, one-line intro, a small stats
  table, "Recent shows" `ShowTable`, "On this day" + "Upcoming" lists.

## CSS

Scope a `[data-experience="minimal"]` block in `app/globals.css`: switch
`--type-display`/`--type-body` to the Georgia serif stack; style the document
`<table>`s, `<h2>` section heads, `sup` footnote refs, the `.doc` measure, and
keep the classic blue links (already added). Functional/Fancy untouched.

## Scope & risk

All pages. Mitigated by the shared primitives — most page bodies become
"breadcrumb + h1 + ShowTable". Build via the subagent flow on a branch.

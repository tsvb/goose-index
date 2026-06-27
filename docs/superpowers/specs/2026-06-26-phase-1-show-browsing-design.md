# Phase 1 — Show Browsing & Discovery: Design Spec

_Date: 2026-06-26 · Status: in progress (goal: top-tier, iterate to highest level)_

## Goal

Turn the Phase 0 dataset (853 shows, 591 venues, 614 songs, 7,416 performances) into a
**beautiful, fast, shareable way to explore every Goose show** — the first user-facing
feature. The show page is the centerpiece; everything else helps you find your way to it.

Quality bar: not "the minimum that works" — a distinctive, production-grade experience a
real fan would bookmark. Avoid generic dashboard/AI aesthetics.

## Design language — "Field guide to a live band"

Editorial, archival, warm, confident. A beautifully typeset almanac crossed with a modern
music archive — data-forward and legible, but with character.

- **Palette:** warm dark base (deep espresso/charcoal, never pure black) as primary, with a
  vivid **amber/gold** accent (echoing Goose's "Dripfield"-era warmth) and a cooler **sage/teal**
  secondary for contrast and links. Warm-paper light mode. Tokens, not hardcoded colors.
- **Type:** a characterful display face for headings (editorial serif or strong grotesque),
  a clean sans for body, and a **monospace for data** (dates, track times, gaps, counts) —
  the mono is a deliberate "almanac/ledger" signal. Loaded via `next/font`.
- **Setlist as a first-class typographic object:** set structure, **segues rendered as `>`**,
  track times in mono, jam-chart songs marked with a glyph, cover songs subtly noted. This is
  the soul of the page and gets the most design care.
- **Motion:** subtle and tasteful (load fades, hover affordances). Never gratuitous.
- **Responsive + accessible:** mobile-first, keyboard-navigable, semantic HTML, good contrast.

## Architecture

Next.js App Router, **server components query Postgres directly via Drizzle** (server-rendered
for SEO + speed; fan-Googled `/shows/2022-06-24` pages must be fast and crawlable).

- **Query layer** `lib/queries/` — focused, typed, tested functions: `getShowByDate`,
  `getShowSetlist`, `listShows(filter)`, `getShowNeighbors`, `getOnThisDay`, `getUpcoming`,
  `listYears`, `listTours`/`getTour`, `listVenues`/`getVenue`, `searchAll`. No SQL in pages.
- **Design system** `app/(components)` + a token theme (Tailwind v4 + `next/font`): primitives
  (Container, Tag/Pill, Card, StatPill) and domain components (SiteHeader, Footer, SearchBox,
  Setlist, ShowCard, ShowList, Filters, OnThisDay, ShowNav).
- **Routes:**
  - `/` — hero, On This Day, recent shows, upcoming shows, search entry, headline stats.
  - `/shows` — browse: filter by year/tour, sort, paginate; fast list/grid.
  - `/shows/[date]` — **the show page** (centerpiece): full setlist w/ segues + track times +
    jam highlights + notes, venue/tour context, prev/next show nav, "listen on nugs" deep-link,
    share-ready metadata. Handles multi-show days via `showorder`.
  - `/years/[year]`, `/tours/[slug]`, `/venues` + `/venues/[id]` — browse dimensions.
  - `/on-this-day`, `/search?q=`.
- **SEO/share:** per-page `<title>`/meta, semantic markup. (OG images: stretch.)
- **Attribution:** elgoose.net credited in the footer on every page.

## Scope

**In (first ship):** the design system, home, shows browse w/ filters, the show page, year /
tour / venue pages, on-this-day, search, header/footer/nav, responsive + dark/light.

**Iterate-to-highest-level passes (after first ship renders):** visual polish on the show page
and setlist, empty/loading states, prev/next + keyboard nav, "On This Day" richness, headline
stats on home, refined motion, accessibility audit, OG share images.

**Deferred (later phases / explicit):** per-song stat pages & gaps (Phase 2), jam analytics
(Phase 3), accounts/"shows I've seen" (Phase 4), the **map view** (needs venue geocoding — a
data-enrichment step; add as a later Phase 1 iteration once core ships), nugs internal API.

## Verification

- Query-layer unit tests (against PGlite, as in Phase 0).
- `npm run typecheck` clean; offline suite green.
- The app runs (`next dev`), real pages render real data; verified by screenshots and by
  loading the centerpiece show (`/shows/2022-06-24` → 15-song acoustic Radio City set).

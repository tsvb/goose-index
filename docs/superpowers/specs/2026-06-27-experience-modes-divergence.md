# Experience Modes — Divergent Layouts (addendum)

_Date: 2026-06-27 · Status: proposed · Builds on `2026-06-27-experience-modes-design.md`_

## Why

Fonts alone didn't make the modes feel different — Fancy and Functional shared
one layout. This addendum diverges the real levers: **layout, density, color,
ornament, and chrome**, so each mode is a distinct experience of the same data.

## Decisions (confirmed with Tim)

- **Minimal — "even more stripped":** a near browser-default document. No branded
  chrome (a plain text breadcrumb/nav instead), no cards, no color, no ornament;
  default-weight headings, default underlined links, plain lists, a readable
  measure, system font. JSON-LD stays embedded. It should read like a clean,
  almost-unstyled semantic HTML page that gets straight to the data.
- **Functional — steel + flat:** drop the gold accent for a cooler **steel**
  accent; flat bordered surfaces (no glow/grain); a **compact data header**
  (no hero) with stat chips; a **search / sort / jams-only toolbar**; a dense
  table. Reads like an instrument.
- **Fancy:** unchanged — the editorial showcase.
- **Chrome varies per mode** (site header + footer), not just page bodies.

## Per-surface plan

- **SiteHeader** (`app/_components/site-header.tsx`):
  - fancy → current branded sticky header (logo mark, nav, search, switcher).
  - functional → slim flat utility bar: small wordmark, compact nav, switcher;
    steel hovers, no blur/gradient.
  - minimal → a plain text row — `Goose Almanac · Shows · Venues · Tours · Search`
    as underlined links + the experience switcher. No logo mark, no sticky/blur.
- **SiteFooter** (`app/_components/site-footer.tsx`):
  - minimal → one plain line of attribution. functional → slim. fancy → current.
- **Show-page header** (`app/shows/[date]/page.tsx`):
  - fancy → current hero (eyebrow, big date, gold venue, glow, stat row, notes).
  - functional → compact boxed header: `YYYY-MM-DD · Venue`, `City · Tour`, stat
    chips, then the toolbar above the table.
  - minimal → breadcrumb + `<h1>Date — Venue</h1>` + a `<dl>` of facts (location,
    tour, songs/sets/duration, elgoose link), then the plain `<ol>` setlist.
  - Implemented as a small per-mode `ShowHeader` selector beside the existing
    `Setlist` selector.
- **`app/globals.css`**:
  - functional → override the gold tokens (`--gold`, `--gold-soft`, `--gold-deep`)
    to a steel ramp; keep flat (glow/grain already off). Optional slight density
    tightening.
  - minimal → ensure the palette + link treatment read as browser-default
    (white/near-black, plain blue underlined links); the "unstyled" feel comes
    from minimal-specific lean templates (header/footer/show-header), not from
    un-styling shared components.

## Scope & sequencing

Build via the same subagent-driven flow on a feature branch. Tasks roughly:
1. Functional steel palette + flat tokens in `globals.css`.
2. Per-mode `SiteHeader` (fancy / functional slim / minimal text).
3. Per-mode `SiteFooter`.
4. Per-mode `ShowHeader` selector (fancy hero / functional compact / minimal doc).
5. Functional setlist **toolbar** (client filter/sort/jams) over the table.
6. Minimal browser-default polish (links, measure) + full verify + ship.

## Risks / notes

- **Minimal "browser-default" vs a Tailwind app:** achieved with minimal-specific
  lean templates for the chrome and show-page header, not by stripping classes off
  shared components.
- **Functional toolbar interactivity** needs client state over the table — if it
  balloons, ship the static compact layout first and add live filtering as a
  fast-follow (Task 5 is separable).
- Listing pages (venues/tours/years/search) inherit the per-mode chrome + global
  CSS automatically; bespoke per-mode bodies for those remain a later follow-up.

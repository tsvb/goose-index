# Settings popover — tuck appearance controls behind a gear

**Date:** 2026-06-29
**Status:** Approved (design)

## Problem

The site header currently carries two always-visible appearance controls:

- `ExperienceSwitcher` — the `fancy / functional / minimal` pill group (visible in
  the header on ≥sm screens, and embedded again inside the mobile menu).
- `ThemeToggle` — a dark/light sun/moon button, shown only in the `fancy`
  experience (gated by `allowsTheme`).

Together they clutter the header chrome. We want to consolidate both behind a
single, low-key **settings** control that opens a popover.

## Constraints discovered

- `data-theme` (dark/light) only changes anything in the **fancy** experience.
  `functional` ships a fixed Web 2.0 light skin and `minimal` explicitly ignores
  `data-theme` (`globals.css` ~line 330). This is why dark/light is gated to
  `fancy` today via `allowsTheme()`. The popover must preserve that: show the
  Appearance section **only when `allowsTheme(current)` is true**.
- The minimal header is intentionally plain and the test
  `site-header.test.tsx` asserts its markup contains **no `<svg>`**. So the
  minimal settings trigger must be a plain **text** button, not a gear icon.
- The design tokens (`--surface`, `--ink`, `--line`, `--faint`, `--gold`, …) are
  redefined per experience via `[data-experience="…"]` selectors. Building the
  popover with the existing token-backed utility classes makes it adopt each
  experience's palette automatically (dark panel in fancy, white Web 2.0 panel in
  functional, plain panel in minimal) — matching the approved mockup with little
  bespoke CSS.

## Approved design

A single client component, `SettingsMenu`, renders a trigger + popover and
absorbs both behaviors. The pill `ExperienceSwitcher` and the `ThemeToggle`
button are removed (their logic is reimplemented inside the panel as the richer
list / segmented control the mockup showed).

### Trigger

- **fancy / functional:** a gear icon button (new `Settings` mark in
  `marks.tsx`). In functional it is styled white to sit on the blue appbar.
- **minimal:** a plain underlined text button reading "Settings" (no `<svg>`).
- Variant is derived from `current` (`minimal` → text, otherwise → icon).
- A11y: `aria-haspopup="dialog"`, `aria-expanded`, `aria-label="Settings"`.

### Popover panel

Positioned below-right of the trigger; built from existing token utility classes
so it adapts per experience.

- **Experience** section — a vertical list of the three experiences, each a
  button showing label + blurb. The current one is marked (check + gold accent,
  `aria-current`). Selecting one: writes the cookie via
  `serializeExperienceCookie`, calls `router.refresh()`, and closes the panel.
- **Appearance** section — rendered **only when `allowsTheme(current)`** (fancy).
  A Dark/Light segmented control (two buttons, `aria-pressed`). Selecting one
  sets `document.documentElement[data-theme]` and `localStorage["ga-theme"]`
  (same keys the pre-paint script in `layout.tsx` already reads). Initial active
  state is read on mount to avoid hydration mismatch (`<html>` already has
  `suppressHydrationWarning`).
- In functional/minimal (no Appearance section) the panel shows a one-line hint:
  "Light and dark apply in the Fancy experience."

### Panel behavior / a11y

- `role="dialog"`, `aria-label="Site settings"`.
- Closes on `Escape` (returns focus to trigger) and on outside `pointerdown`.
- On open, focus moves to the first option; on close, focus returns to trigger.
- Closed by default, so SSR / `renderToStaticMarkup` emits only the trigger
  (keeps the minimal "no `<svg>`" guarantee).

## Components & files

**Add**
- `app/_components/settings-menu.tsx` — the trigger + popover (client component);
  props `{ current: Experience }`.
- `app/_components/settings-menu.test.tsx`.
- `Settings` (gear) icon in `app/_components/marks.tsx`, matching the existing
  lucide-style `IconProps` marks.

**Modify**
- `app/_components/site-header.tsx` — in all three header variants, replace the
  inline `<ExperienceSwitcher>` + `{allowsTheme && <ThemeToggle/>}` with
  `<SettingsMenu current={experience} />`. Drop the now-unused
  `ExperienceSwitcher` / `ThemeToggle` / `allowsTheme` imports.
- `app/_components/mobile-nav.tsx` — remove the embedded "Experience" section and
  the `ExperienceSwitcher` import (the gear lives in the header at all widths).
- `app/globals.css` — remove the now-dead functional
  `[data-experience="functional"] [aria-label="Experience mode"]` rules (~326–328);
  add a white gear-trigger style for the functional appbar; add minor per-experience
  panel overrides only if the token-driven defaults need them (e.g. functional
  panel shadow, minimal square corners).

**Delete**
- `app/_components/experience-switcher.tsx` (pill UI replaced by the panel list).
- `app/_components/theme-toggle.tsx` (replaced by the panel segmented control).

> Before deleting, confirm no other module imports these two components (current
> importers are only `site-header.tsx` and `mobile-nav.tsx`).

`lib/experience.ts` (incl. `allowsTheme`) is unchanged and still consumed by
`SettingsMenu`.

## Data flow

- Experience: server reads cookie (`getExperience` in `layout.tsx` /
  `SiteHeader`) → passed as `current` prop → user selection rewrites the cookie
  client-side → `router.refresh()` re-renders server components with the new
  experience.
- Theme: client-only. Pre-paint script in `layout.tsx` applies saved
  `localStorage["ga-theme"]` before first paint; the panel's segmented control
  reads/writes the same key and the `data-theme` attribute.

## Testing

- `app/_components/settings-menu.test.tsx`:
  - Trigger variant per experience — fancy/functional render a gear `<svg>`;
    minimal renders text "Settings" and **no `<svg>`**.
  - Appearance section present for `fancy`, absent for `functional`/`minimal`.
  - Selecting an experience writes the cookie and calls `router.refresh()`.
  - Use `@testing-library/react` + user interaction if available in the repo;
    otherwise render the panel via an internal test-only open state.
- `app/_components/site-header.test.tsx`: keep passing — especially the minimal
  "no `<svg>`" assertion (text trigger). Update any assertion that depended on the
  removed switcher/toggle markup.
- `lib/experience.test.ts` (`allowsTheme`) — unchanged.

## Out of scope (YAGNI)

- No new `/settings` route.
- No new persisted preferences beyond the existing experience cookie and
  `ga-theme` localStorage key.
- No change to which experiences support dark/light.

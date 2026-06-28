# "Listen / Watch on nugs" — design

_Date: 2026-06-28 · Status: design (awaiting review) · Implements the Almanac side of the [AppleNugs deep-link contract](../../integrations/applenugs-deeplink.md)._

## Goal

Let Goose fans who use the **AppleNugs** player hand off from the Almanac to **listen
or watch** a show — the whole night from the show header, or a specific performance
from the setlist. A tasteful value-add for the overlap audience; unobtrusive for
everyone else. No commercial angle.

## Two affordances

1. **Show header — play the whole show.** In all three modes' `ShowHeader` branches,
   a secondary **Listen on nugs** action (queues the entire show) and a **Watch**
   variant (`media=video`), placed next to the existing "View on elgoose" link.
2. **Setlist rows — per-track.** In all three setlist variants, a small **▷** on each
   row that deep-links *that performance*. **Hover-reveal where a real pointer exists
   (`@media (hover: hover)`), always-visible on touch** so phones stay usable without
   cluttering the desktop.

Both are deliberately quiet (secondary styling, not primary CTAs).

## Contract extension (track-level)

The locked show-level URL is unchanged. This feature adds **track-level** params to the
contract (the contract doc gets a new section):

```
# show-level (already locked) — plays the whole show
applenugs://show/<YYYY-MM-DD>?artist=Goose[&venue=<venue>][&media=audio|video]

# track-level (new) — jumps to one performance
applenugs://show/<YYYY-MM-DD>?artist=Goose&song=<title>&set=<n>&pos=<n>[&venue=][&media=]
```

- `song` = the song **title** (URL-encoded) — the app matches it against the resolved
  container's nugs track titles. `set` = `setNumber`, `pos` = `position` disambiguate
  repeats/covers within the show. All three come from existing `SetlistEntry` fields.
- The app resolves the show (per the locked contract), then finds the matching track
  and starts playback there. **Honest dependency:** track-level links only *work* once
  AppleNugs adds track matching; show-level works as soon as the app has the basic
  handler. The Almanac emits both regardless — the contract leads the app.

## Components & structure

- **`lib/nugs.ts`** — pure URL builders, no React:
  - `nugsShowHref({ date, venue, media }): string` → the show-level `applenugs://` URL.
  - `nugsTrackHref({ date, venue, song, set, pos, media }): string` → the track-level URL.
  - `nugsWebFallback({ date, venue }): string` → a `https://play.nugs.net/...` Goose
    search URL for users without the app.
  - `NUGS_SCHEME = "applenugs"` and the artist constant live here.
- **`app/_components/nugs-link.tsx`** — a small **client** component `NugsLink`
  (`"use client"`). Renders an anchor to the `applenugs://` URL; on click it attempts
  the scheme and, if the app doesn't take focus within a short timeout (~800 ms),
  redirects to the web fallback — the "never a dead click" behavior. Props:
  `{ href, fallback, label, variant }` where `variant` selects mode styling
  (`fancy | functional | minimal`) and `label` covers "Listen", "Watch", or the
  per-track glyph. One component, reused by both surfaces.
- **Wiring (no new layout):**
  - `app/_components/show-header.tsx` — each of the three branches renders a
    `NugsShowLinks` (Listen + Watch) next to the elgoose affordance.
  - `app/_components/setlist/{fancy,functional,minimal}.tsx` — each row renders the
    per-track `NugsLink` glyph (hover-reveal/always-on-touch via a shared CSS class).
- **CSS** (`app/globals.css`) — a `.nugs-*` layer: the secondary link/chip styling per
  mode (Fancy soft-blue, Functional gel chip, Minimal plain text link) and the
  `.nugs-track` hover-reveal rule (`@media (hover: hover) { ... visibility: hidden }`,
  revealed on row hover; visible by default otherwise).

## Per-mode look

- **Fancy** — a soft nugs-blue link/glyph, low-contrast, beside the gold elgoose link.
- **Functional** — a small gel-style chip (`▷ Listen`), consistent with the Web 2.0 controls.
- **Minimal** — a plain underlined "listen" text link; no glyph ornament, true to the document.

## Error handling / edge cases

- **No app installed** → the `NugsLink` timeout falls back to the nugs.net web search.
- **Future shows / empty setlist** → no setlist rows, so no per-track links; the show
  header still offers show-level (the app resolves "no recording" gracefully).
- **Missing `venue`** → omitted from the URL (date alone is the key; venue is only a
  tie-break hint).
- The Almanac never checks nugs availability or subscription — the app owns that.

## Testing

- **`lib/nugs.ts` unit tests** — URL building for show + track (encoding of `song`,
  `venue`; `media` default = audio; fallback URL shape).
- **`NugsLink` render test** (`renderToStaticMarkup`) — emits the `applenugs://` href and
  carries the fallback; variant classes applied.
- **Setlist + show-header render tests** — extend existing ones to assert the per-track
  href and the show-level Listen/Watch hrefs appear, per mode.

## Scope

- **In:** show-header Listen/Watch, setlist per-track hover-reveal, the URL helpers +
  `NugsLink` (with web fallback), the contract-doc track-level extension, tests.
- **Out:** song-page rows (we chose the setlist hover-reveal instead); the AppleNugs
  app-side handler/resolver (Tim's repo); any subscription/availability awareness.

## Build

Subagent-driven on a branch: (1) `lib/nugs.ts` helpers + tests + contract-doc extension;
(2) `NugsLink` client component + CSS + render test; (3) wire the show header (3 modes);
(4) wire the setlist per-track (3 modes) + hover/touch CSS; (5) verify (typecheck, tests,
360px + the hover/touch behavior).

# AppleNugs ⇄ Goose Index — deep-link contract

_Status: BUILT 2026-06-28 (both sides live) · Applies to: this repo (emits links) + `tsvb/applenugs` (handles them)_

A value-add for Goose fans who use both: every show (and song performance) in the
Goose Index can hand off to the **AppleNugs** player to **listen or watch** that night on
nugs.net. The Goose Index stays **decoupled from nugs's catalog** — it emits a show
identity; the app owns resolution and subscriber entitlement. No commercial angle;
just a slick handoff.

## The URL scheme

```
applenugs://show/<YYYY-MM-DD>?artist=<name>[&venue=<venue>][&media=audio|video]
```

| Part | Required | Notes |
|------|----------|-------|
| scheme `applenugs` | yes | Registered by the app. **Not** `nugs://` (official app) and **not** `nugsnet://` (the app's OAuth-only, deliberately unregistered, scheme). |
| host/action `show` | yes | The resource. Leaves room for future actions (`artist`, `search`, …). |
| path `<YYYY-MM-DD>` | yes | **The join key.** The performance date — the one identifier the Goose Index and nugs share natively. |
| `artist` | yes | The band name, e.g. `Goose`. Keeps the app's handler generic (it matches via `allArtists()` by name) instead of hardcoding Goose. URL-encoded. |
| `venue` | optional | Soft tie-breaker / verifier for two-show days (nugs has no "show order"; it distinguishes same-date shows by venue). URL-encoded. Without it the app takes the first same-date match; a venue that matches nothing is treated as a miss and falls through to search rather than presenting a picker (verified in `DeepLinkRouter.swift`, 2026-08-18 — see "Resolution" below). |
| `media` | optional | `audio` (default when omitted) or `video`. The app supports both. |

**Examples**
```
applenugs://show/2024-04-20?artist=Goose                          # listen (audio)
applenugs://show/2024-04-20?artist=Goose&venue=The%20Salt%20Shed  # listen, venue-disambiguated
applenugs://show/2026-05-30?artist=Goose&media=video              # watch (video)
```

### Track-level (jump to one performance)

```
applenugs://show/<YYYY-MM-DD>?artist=Goose&song=<title>&set=<n>&pos=<n>[&venue=][&media=]
```

| Part | Notes |
|------|-------|
| `song` | The song **title** (percent-encoded), matched against the resolved container's nugs track titles. |
| `set` / `pos` | The setlist `setNumber` / `position` — disambiguate repeats/covers within the show. |

The app resolves the show (above), then finds the matching track and starts playback
there. Matching is title-driven (3-tier: exact → contains → longest-overlap); `set`/`pos`
are parsed but not yet used to disambiguate a song played twice in one show.

### Encoding

Query values are **percent-encoded with `%20` for spaces** (e.g. `song=Hot%20Tea`).
Do not use `+` for spaces — Swift's `URLComponents.queryItems` does not decode `+` to a
space, so a `+` would reach the app literally.

## Resolution (app side)

The app turns `artist + date (+ venue, media)` into a nugs container, reusing methods
it already has (`AppleNugs/Core/NugsClient.swift` + `Catalog.swift`):

1. `allArtists()` → find the `ArtistEntry` whose `name` matches `artist` → `artistID`. (Cache it — `AppModel` already caches the artist list.)
2. **audio:** `artistShows(id: artistID)` → `[ContainerSummary]` → match `dateText == <date>` (use `venue` to break ties) → navigate `Route.album(id: container.id)`.
   **video:** `artistVideos(id: artistID)` → `[VideoSummary]` → match `performanceDate`/`dateText` (+ `venue`) → open the video detail (`videoDetail(containerId:)`).
3. Fallback if no per-artist match: `search("<artist> <date>")` and match the same way.
4. **No picker UI exists.** Verified against `AppleNugs/Core/DeepLinkRouter.swift` on
   2026-08-18: with no usable venue hint, `pick(_:venue:)` takes the **first** same-day
   match (`cs.first`) rather than disambiguating. A venue hint that matches nothing is
   treated as a miss — the caller keeps paging, then falls through to the `search(...)`
   fallback from step 3 — rather than silently taking the unfiltered first match. Total
   failure (no artist, no date match anywhere, empty search) surfaces as a toast
   ("That show isn't on nugs" / "No video for that show on nugs" / "Couldn't open that
   show on nugs"), never a picker. Presenting choices is an unimplemented aspiration —
   don't imply it's current behaviour in copy that describes the app.

## Web fallback (no app installed)

**As of the nugs-web-links merge (2026-08-18), this is no longer search-only.** The Goose
Index imports nugs's Goose catalog nightly (`lib/nugs-catalog/` + `scripts/import-nugs.ts`,
run by `.github/workflows/sync.yml`) and resolves one nugs containerID per show onto
`shows.nugs_container_id` (plus `shows.nugs_has_video`). Where that resolution succeeded,
`nugsWebFallback` (`lib/nugs.ts`) returns the exact page: `https://play.nugs.net/release/<containerID>`
for audio, or `https://play.nugs.net/watch/release/<containerID>` for video (the Watch
button, gated on `nugs_has_video`). Those URL shapes were read from play.nugs.net's own
router table, not inferred — the API's own `pageURL` field is a dead legacy path that 301s
to `/404/`, so don't build links from it. Full evidence trail:
`docs/superpowers/specs/2026-08-18-nugs-web-links-design.md`.

Only shows with no resolved containerID still fall back to the old behaviour: a
`play.nugs.net` search for `Goose <date>`. Two things haven't changed: **play.nugs.net
requires a login** either way — landing there doesn't mean the visitor can play it — and
**there is still no per-track web route**, so a web link reaches a show, never one song;
only the app-side handoff can start at a specific performance.

## Who implements what

**`tsvb/applenugs` (✅ built 2026-06-28):**
- Register the scheme: add `CFBundleURLTypes` (scheme `applenugs`) to the Info block in `project.yml`.
- Add `.onOpenURL` on the root scene (`AppleNugsApp.swift` / `RootView`) → parse the URL → branch on `media` → run the resolver → set the navigation `Route`.
- Add the resolver (~a thin wrapper over `allArtists` / `artistShows` / `artistVideos` / `search`).
- Single-window handoff (added 2026-07-02): `.handlesExternalEvents(preferring:allowing:)` on the
  root view, so a link that arrives while the app is running reuses the existing window instead
  of opening a second one.

**Goose Index (this repo):**
- A tasteful **"Listen on nugs"** (and **"Watch"**) affordance on show pages, optionally on song-page performance rows / "longest versions", emitting the URL above — across all three experience modes, unobtrusive for non-subscribers.
- `nugsShowHref({ date, venue, media })` / `nugsTrackHref` / `nugsWebFallback` /
  `nugsWebHref` helpers (`lib/nugs.ts`) that build the `applenugs://` URLs above and the
  `play.nugs.net` fallback URLs.
- **A nightly catalog import** (✅ built 2026-08-18, `lib/nugs-catalog/` +
  `scripts/import-nugs.ts`, run by `.github/workflows/sync.yml`) that pulls nugs's Goose
  catalog and resolves `shows.nugs_container_id` / `shows.nugs_has_video`, so the web
  fallback can link the exact show instead of only a search.

## Decisions & things considered

- **Custom scheme** over Universal Links — simplest, cross-platform (macOS now, Windows/iOS later), zero domain setup. Tradeoff: a click does nothing if the app isn't installed → mitigated by the web fallback.
- **Date is the key, venue tie-breaks** — dropped the earlier `/order` idea (an elgoose-ism that doesn't map to nugs).
- **`?eg=<elgooseShowId>` dropped** — the app doesn't ingest elgoose data, so it adds nothing.

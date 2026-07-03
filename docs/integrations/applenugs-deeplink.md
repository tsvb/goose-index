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
| `venue` | optional | Soft tie-breaker / verifier for two-show days (nugs has no "show order"; it distinguishes same-date shows by venue). URL-encoded. If still ambiguous, the app presents the matches. |
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
4. If multiple match (rare), present the choices rather than guessing.

## Web fallback (no app installed)

The Goose Index links can't construct a precise per-show nugs.net URL (that needs the
containerID the app resolves), so the fallback is a nugs.net Goose page / search —
"hear it on nugs" for people without the app. (If AppleNugs ever exposes a web
resolver, the fallback can point there for an exact landing.)

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
- `nugsShowHref({ date, venue, media })` / `nugsTrackHref` / `nugsWebFallback` helpers
  (`lib/nugs.ts`) that build the URLs above.

## Decisions & things considered

- **Custom scheme** over Universal Links — simplest, cross-platform (macOS now, Windows/iOS later), zero domain setup. Tradeoff: a click does nothing if the app isn't installed → mitigated by the web fallback.
- **Date is the key, venue tie-breaks** — dropped the earlier `/order` idea (an elgoose-ism that doesn't map to nugs).
- **`?eg=<elgooseShowId>` dropped** — the app doesn't ingest elgoose data, so it adds nothing.

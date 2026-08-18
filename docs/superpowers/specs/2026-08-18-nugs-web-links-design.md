# nugs.net web links — link the exact show, not a search

**Date:** 2026-08-18
**Status:** Approved (design)
**Supersedes:** the web-fallback decision in
[`2026-06-28-nugs-listen-watch-design.md`](2026-06-28-nugs-listen-watch-design.md)
**Followed by:** [`2026-08-18-listen-links-page-design.md`](2026-08-18-listen-links-page-design.md),
which documents the behaviour this spec defines and should be built after it.

## Problem

Every show page emits `applenugs://` links (`▷ Listen on nugs`, `▷ Watch`, and a `▷` on
setlist rows). When AppleNugs isn't installed, `NugsLink` waits ~1.2s and then sends the
visitor to `nugsWebFallback` — a `play.nugs.net` **search** for `Goose <date>`.

A search is where we landed because the integration contract states the index cannot build a
precise per-show nugs.net URL: that needs a containerID the app resolves at runtime
(`docs/integrations/applenugs-deeplink.md`, "Web fallback"). That statement is now false, and
the search costs the visitor a second step on every app-less click.

There is also no affordance at all for the visitor who simply wants the show on nugs.net and
has no interest in installing a Mac app.

## Evidence discovered (probed live 2026-08-18)

All figures below were taken on 2026-08-18 and move as nugs adds shows.

- **`catalog.containersAll` needs no authentication.** The same call `NugsClient.artistShows`
  makes, minus the Bearer, returns HTTP 200. `catalog.artists` gives Goose as `artistID=1205`.
- **Paging the catalog yields 490 audio containers across 483 distinct dates, and 203 video
  containers.** Each carries `containerID`, `performanceDateFormatted`, `venueName`,
  `venueCity`, `venueState` and a full track list.
- **The 203 video container IDs are a strict subset of the 490 audio IDs — zero video-only
  containers.** One container is one show; video is a property of it, not a separate entity.
  This is what collapses the schema to a boolean.
- **The real URL shapes, read from play.nugs.net's own router table** (`index-*.js`, the
  `path:` entries), not inferred:
  - audio — `{ path: '/release', children: [{ path: ':id(\d+)' }] }` → `https://play.nugs.net/release/<containerID>`
  - video — `{ path: '/watch', children: [{ path: 'release/:id(\d+)' }] }` → `https://play.nugs.net/watch/release/<containerID>`
- **There is no per-track web route.** The router exposes only `:id(\d+)` under `/release`.
  A web link can reach a show, never a song.
- **Same-date pairs are real:** `2022-07-22`, `2025-05-10`, `2026-05-09`. Venue still has to
  break the tie.

Three findings that would otherwise cost time to rediscover:

1. **The API's own `pageURL` field is a dead legacy path.** It 301s to `https://www.nugs.net/404/`.
   Do not build links from it.
2. **`play.nugs.net` returns a byte-identical 3379-byte SPA shell for every path**, including
   nonsense paths. HTTP status cannot validate a route; only the router table can.
3. **The web player requires a login.** Unauthenticated, every route bounces to `id.nugs.net`.

## What this changes about the project's stance

The contract deliberately kept the index **decoupled from nugs's catalog**: it emitted a show
identity and the app owned resolution. Storing containerIDs reverses that for the web-link path.
The decoupling still holds where it was load-bearing — the `applenugs://` links are unchanged
and the app still resolves them itself. What we add is a second, independent path for visitors
without the app.

## Approved design

### Data model

New table `nugs_containers`, holding what nugs actually said:

| column | notes |
| --- | --- |
| `container_id` | integer, primary key |
| `performance_date` | date, from `performanceDateFormatted` |
| `venue_name`, `venue_city`, `venue_state` | text, for tie-breaking and audit |
| `has_video` | boolean — true when the container appears in the `videoReleaseType=6` list |
| `fetched_at` | timestamptz, so staleness is visible |

Plus two resolved columns on `shows`: `nugs_container_id` and `nugs_has_video`, mirroring how
`bandcamp_url` already sits directly on `shows`. Pages read one column; no join.

Both exist because without the raw table you cannot distinguish *"nugs has this night and we
failed to match it"* from *"nugs doesn't have this night"* — a distinction the `verify` and
`audit-source` scripts trade on, and one the explainer page depends on to tell the truth.

### Matching

`scripts/nugs-match.ts` — pure and unit-tested, in the shape of `scripts/album-match.ts`.

- Date is the join key.
- Two containers on one date are broken apart by **normalized venue containment** — the same
  bidirectional containment idea `DeepLinkMatch.venueMatches` uses in the app, but **not the
  same normalization**. Measured 2026-08-18, the app deletes all punctuation with no
  substitute, which collapses `"St-Denis"` to `"stdenis"` (so it stops matching a nugs venue
  of `"St Denis"`) and leaves a double space for `" & "`. This side deletes apostrophes — so
  `"Slim's"` matches a hint of `"Slims"` — and turns every other punctuation run into a single
  space. That is strictly better on both counts; the app is the side worth bringing up, as a
  follow-up in `tsvb/applenugs`, not something to "fix" by copying the weaker rule here.
- **Ambiguity leaves the show unmatched.** An unmatched show falls back to the current search
  behaviour, so an unresolved tie degrades to today's status quo rather than confidently
  linking the wrong night.

### Sync

`scripts/import-nugs.ts`, exposed as `npm run import-nugs`, following `import-albums.ts`
conventions: `announceTarget(url)` so the production-database guard prints its target before
writing, and a `--dry-run` flag. Roughly seven paged requests. Wired into the nightly job that
already runs `verify`.

The sync **fails loudly and leaves existing rows intact** rather than blanking them — a shape
change or a new auth wall must not empty the table.

### Link helpers (`lib/nugs.ts`)

- `nugsWebHref({ containerId, media })` → `https://play.nugs.net/release/<id>`, or
  `https://play.nugs.net/watch/release/<id>` when `media === "video"`.
- `nugsWebFallback` keeps its current **call shape** — existing call sites compile unchanged —
  and gains an optional `containerId`: the exact URL when known, today's search when not.

Which media each caller passes, stated so it isn't guessed:

| caller | fallback target when a container is known |
| --- | --- |
| `▷ Listen on nugs` | `/release/<id>` |
| `▷ Watch` | `/watch/release/<id>` |
| `▷` setlist row | `/release/<id>` — there is no per-track web route |

### UI

**One** new control beside Bandcamp / Listen / Watch on show pages: **"Open on nugs.net"**,
pointing at `/release/<id>`, the show's home on nugs. It is **not** split into audio and video
variants — video containers are the same container, and a fifth control on a row that already
carries four earns less than it costs. The `media: "video"` route is reached through the Watch
button's fallback, per the table above.

Rendered **only when a container is known**, in all three experiences, following the existing
`nugs-show` class treatment; no new CSS.

## What the copy may not claim

Per the site's copy rules, a claim never travels without its evidence:

- The button appears only when a container genuinely exists in our data.
- Nothing asserts the show is **playable** — that depends on the visitor's subscription.
- Nothing claims signing in returns you to the show. That was not verified, and verifying it
  would require logging in, so it stays unstated rather than assumed.

## Testing

- **Matcher** — unit tests over the pure module, including the three real collision dates and
  the unmatched-on-ambiguity rule.
- **Helpers** — both URL shapes; the fallback's known and unknown branches.
- **Components** — the new control in each experience, and its absence when no container is known.
- **Parser** — fixture-backed, *plus a check against live data*. In the app, fixtures are
  precisely how a silent drop of every free-video item slipped through; fixtures encode what we
  already believe.

## Risks

An undocumented API can change shape or start requiring auth. Mitigations: the sync fails loudly,
existing rows survive a failed run, and `fetched_at` makes staleness visible rather than silent.

## Out of scope

- **Track-level web links** — the web player has no per-track route. The `▷` row buttons keep
  starting the *app* at a song; a web link reaches the show only. The explainer page must
  describe this asymmetry.
- Any change to the `applenugs://` scheme, `NugsLink`'s timing behaviour, or the app itself.
- The explainer page — that is the companion spec.

## Open questions

- Does `id.nugs.net` carry the return URL through sign-in? Unverified, and deliberately not
  claimed either way in copy.
- Coverage: how many of the index's shows resolve to a container. Measurable only after the
  first import runs; the number belongs on the page as a computed value, never hard-coded.

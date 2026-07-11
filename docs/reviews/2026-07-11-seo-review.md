# SEO Review — Goose Index

**Date:** 2026-07-11 · **Scope:** every crawler-facing surface — robots, sitemap, canonical/OG/Twitter metadata, JSON-LD, HTTP-level indexability, Core Web Vitals hooks

## How this review was done

Six code-reading auditors each swept a slice of the surface (robots + sitemap;
metadata + Open Graph; JSON-LD; canonicalization; indexability of filter/search
URLs; Core Web Vitals) and produced findings against real file:line evidence.
Every medium/high claim was then passed through **three independent skeptics**
with different biases — an SEO-correctness reviewer checking the technical
mechanism against real Google/Bing behavior (not folklore), a severity-fit
reviewer weighing impact against the site's non-commercial fan-index scope, and
a shipping-engineer reviewer confirming the recommended fix doesn't regress the
almanac aesthetic, the three experience modes, cookie-based rendering, or the
nightly-sync/live-show flow. Findings whose SEO mechanism didn't hold up, or
whose impact was overstated for a fan companion to elgoose.net, were downgraded
or dropped. All work is code-read — no crawl, no Search Console, no Lighthouse
run. Where a claim depends on production behavior we've said so.

Framing note: this site is **complementary to elgoose.net**, not competing with
it for canonical Goose content. Half the SEO playbook (aggressive on-page
optimization for contested queries, faceted-navigation crawl-budget
engineering, entity-graph land-grabs) simply doesn't apply. The findings below
are pruned to what actually matters at this scale and posture — indexability
hygiene, honest share cards, and small Core Web Vitals wins.

---

## Verdict

The scaffolding is right: a real sitemap, a real robots.txt, MusicEvent
JSON-LD on show pages, a metadataBase, per-entity descriptions, a www canonical
origin, human-readable URLs, and a comprehensive URL scheme. What's missing is
the middle layer of directives that tells search engines which of the many
URL shapes to trust — canonicals, noindex on the query-driven surfaces, and
list-page Open Graph. Everything below is a targeted fix inside the existing
metadata system.

The gaps cluster in three places:

1. **Nothing declares a canonical.** `alternates.canonical` is not set on any
   page. Faceted list URLs, `?n=` show variants, and cross-URL duplicates
   (`/shows?year=2024` vs `/years/2024`, `/songs?sort=overdue` vs
   `/stats/current-gaps`) all compete with each other with no preference
   declared.
2. **Every query-driven surface is indexable.** `/search?q=…`, `/songs?q=…`,
   `/venues?q=…`, and `/shows?year=&tour=&dir=&per=&page=` all have no
   `robots: { index: false }`. Standard Google guidance is to keep internal
   search and pure-filter permutations out of the index.
3. **List pages tell social scrapers they are the homepage.** Every hub that
   doesn't call `entityOpenGraph` (/shows, /songs, /venues, /tours, /years,
   /stats, /on-this-day, /search) inherits the root `openGraph` wholesale, so
   a `/venues` link shared into Discord/Slack renders with the homepage title,
   description, and URL.

A separate known issue — the global `dynamic = "force-dynamic"` in
`app/layout.tsx:64` causing `notFound()` to return HTTP 200 as a soft-404 — is
already documented in the UX review (`docs/reviews/2026-07-10-ux-ui-review.md`,
lines 325-337) and folded into P0 there. We do not re-log it below. It is
materially bigger than most items in this review.

---

## What's already in good shape

- **Sitemap coverage is genuinely complete.** `app/sitemap.ts:19-27` enumerates
  homepage, all seven static hubs, every stat cut from
  `app/stats/cuts.ts:13-24`, every year, tour, venue, show date, and song slug.
  Nothing indexable is missing.
- **The canonical form is respected in the sitemap.** `app/sitemap.ts:25`
  emits `/shows/${d}` with no `?n=` parameter even though multi-show days
  exist, and `lib/queries/sitemap.ts:15-22` filters `isNotNull(songs.slug)`
  so unlogged songs never leak in as `/songs/null`.
- **Origin discipline.** `SITE_URL` in `lib/site.ts:6` commits to the www host,
  the comment at `lib/site.ts:3-5` documents that the apex 307s to www, and
  every sitemap URL and OG URL is built through `${SITE_URL}${path}` — crawlers
  avoid a redirect hop on every URL.
- **`metadataBase` is set correctly** (`app/layout.tsx:45`), so every relative
  path (including the file-convention `opengraph-image`) resolves to an
  absolute URL for social scrapers.
- **`entityOpenGraph` handles the Next.js OG-replacement gotcha.**
  `lib/site.ts:11-25` re-attaches the parent's `openGraph.images` so the shared
  `app/opengraph-image.tsx` card survives on entity pages even though
  `openGraph` is replaced wholesale.
- **Entity descriptions consistently include "Goose" and the entity name** —
  venues, tours, songs, shows, and years each get a hand-tuned description
  that reads like an almanac entry rather than boilerplate.
- **MusicEvent JSON-LD is well-formed on show pages** (`lib/jsonld.ts:4-25`) —
  correct `@context`, `MusicEvent` type, ISO `startDate`, `eventStatus`,
  `eventAttendanceMode`, `MusicVenue` location, `MusicGroup` performer,
  `workPerformed` list, with a unit test round-trip in `lib/jsonld.test.ts`.
- **`<script type="application/ld+json">` is escaped against `</script>`
  breakout** (`app/_components/json-ld.tsx:1-5`).
- **`robots.ts` advertises the sitemap** (`app/robots.ts:8`), so crawlers
  don't need Search Console registration to discover it.
- **URL scheme is human-readable and stable** — `/shows/YYYY-MM-DD`,
  `/songs/[slug]`, `/venues/[id]`, `/tours/[id]`, `/years/[year]`,
  `/stats/[cut]` — no trailing slashes, no rewrite maze.
- **Every entity type is linked from an index and cross-linked to its
  siblings.** No orphans in the sitemap; show ↔ song ↔ venue ↔ tour ↔ year
  round-trip in ≤2 clicks, and the show page ships prev/next-night neighbors.
- **Loading states exist** as `loading.tsx` skeletons on the DB-blocking
  routes, giving Chrome a stable LCP-eligible frame earlier and improving
  perceived TTFB.
- **Client-component surface is small and correctly scoped**; the only inline
  `<script>` in the document is the ~200-byte theme-init snippet
  (`app/layout.tsx:67-80`); no third-party render-blocking scripts.

---

## P0 — Fix first

These are the highest-leverage gaps where the fix is small and the mechanism
is well-established. Order matters: 1 unblocks 2 and 3.

### 1. Nothing declares a canonical URL — every faceted URL competes with its base

`Grep alternates` across `app/` returns zero hits. No `generateMetadata` or
static `metadata` sets `alternates.canonical` (`app/shows/[date]/page.tsx:53-57`,
`app/songs/[slug]/page.tsx:23`, `app/venues/[id]/page.tsx:22-26`,
`app/shows/page.tsx:29-31`, `app/songs/page.tsx:12`, `app/venues/page.tsx:11-14`,
etc.). `entityOpenGraph` at `lib/site.ts:11-25` sets `openGraph.url` (which is
**not** a substitute for `<link rel="canonical">`) but never `alternates`.

This is the single most consequential gap on the site and the prerequisite for
almost every other finding below. The pairs that will collide today:

- `/shows/2023-12-31` and `/shows/2023-12-31?n=2` render **different** shows
  (`app/shows/[date]/page.tsx:44-46`) but neither declares itself canonical —
  Google will collapse show #2 into show #1's index entry, dropping the show
  #2 setlist.
- `/shows?year=2024` and `/years/2024` call the same `listShows({ year })`
  under the hood (`app/shows/page.tsx:57-58`, `app/years/[year]/page.tsx:30-31`)
  — same underlying show set, different chrome, no preference declared.
- `/songs?sort=overdue` and `/stats/current-gaps` are the **same cut** — the
  code says so in a comment (`app/songs/page.tsx:20-21`) — and both are
  fully indexable with identical top-100 rankings.
- `/shows`, `/shows?dir=asc`, `/shows?per=100`, `/shows?page=3`, and every
  combination reachable from the in-page filter pills at
  `app/shows/page.tsx:151-205` are indexable variants of the same list.

**Fix.** Fold canonical emission into `entityOpenGraph` (extend it, or add a
sibling `entityCanonical(path)` helper) and set `alternates.canonical` on
every metadata export. Specifically:

- Entity detail pages → self-canonical using the same `showHref(date, order)`
  helper the page uses everywhere else (`lib/queries/format.ts:59-61`), so
  `/shows/DATE` canonicals to itself for show 1 and `/shows/DATE?n=N`
  canonicals to itself for show N.
- List pages with filter/sort/pagination noise → canonical to the bare route,
  **except** when there is a dedicated entity page for that scope:
  `/shows?year=Y` should canonical to `/years/${year}`, `/shows?tour=T` to
  `/tours/${tourId}`, `/songs?sort=overdue` to `/stats/current-gaps`,
  `/songs?sort=played` to `/stats/most-played`, `/songs?sort=rare` to
  `/stats/rarities`. Preserve `?page=N` on paginated variants as self-canonical
  (Google post-2019 guidance — canonicaling page 2 → page 1 hides deep rows).

The list of dedicated targets is finite (four sort/cut pairs, plus
year/tour), so a small lookup table beside `entityOpenGraph` handles it.

### 2. `/shows/[date]?n=N` broadcasts show 1's URL as its canonical

Same file, one line: `app/shows/[date]/page.tsx:56` passes
`path: \`/shows/${date}\`` to `entityOpenGraph`, so every `?n=` variant emits
`<meta property="og:url" content="https://www.gooseindex.com/shows/${date}">`
regardless of which show on that date is being rendered. Title, description,
and setlist all describe show N; only the canonical-substitute signal lies.

This is a fan-facing bug independent of Google. Facebook, LinkedIn, Slack,
iMessage, Discord, and Bluesky all key their share-card cache on `og:url` —
sharing show 2's link to Discord renders show 1's card, and re-scraping show 2
overwrites the same cache key, so both shows can't have preview cards
simultaneously. NYE runs, festival late shows, and two-set-night doubles are
exactly the moments fans post.

**Fix.** One line: replace `path: \`/shows/${date}\`` with
`path: showHref(date, show.order)`. The helper already produces the right
disambiguated path everywhere else on the page (lines 113, 118, 147, 189, 192,
200, 211). When P0-1's `alternates.canonical` lands, thread the same value
through so the two signals can't drift again.

### 3. List pages inherit the homepage's Open Graph — share cards lie about every hub

Only entity detail pages (`shows/[date]`, `songs/[slug]`, `venues/[id]`,
`tours/[id]`, `years/[year]`) call `entityOpenGraph`. Every hub route — /shows
(`app/shows/page.tsx:29-31`), /songs (`app/songs/page.tsx:12`), /venues
(`app/venues/page.tsx:11-14`), /tours (`app/tours/page.tsx:10-13`), /years
(`app/years/page.tsx:9-12`), /stats and /stats/[cut] (`app/stats/page.tsx:11-14`,
`app/stats/[cut]/page.tsx:24-30`), /on-this-day (`app/on-this-day/page.tsx:10`),
/search (`app/search/page.tsx:17-25`) — returns metadata without an
`openGraph` field.

Next.js Metadata inheritance replaces `openGraph` as a single unit when a
child doesn't declare one, so every list page inherits `app/layout.tsx:51-58`
verbatim: `og:title = "Goose Index — every show, every night"`,
`og:description = <homepage copy>`, `og:url = https://www.gooseindex.com`. The
document `<title>` and `<meta name=description>` are correct (they're
shallow-merged via the template), and the file-convention
`app/opengraph-image.tsx` still renders as the card image on child routes.
**Only the text lies.** A fan pasting `/stats/current-gaps` into Discord sees
a card headlined "every show, every night" with `gooseindex.com` in the URL
slot.

**Fix.** Add `openGraph: entityOpenGraph({ title, description, path, parent:
await parent })` to every list page's metadata. The static-metadata pages
(/songs, /venues, /tours, /years, /stats, /on-this-day) need to convert to
`generateMetadata({}, parent)` to access `ResolvingMetadata` — a mechanical
change, no runtime cost. Alternatively, extend `entityOpenGraph` to make
`parent` optional so those files can stay as static exports (the file-convention
image handles itself).

### 4. `/search`, `/songs?q=`, and `/venues?q=` are fully indexable with no noindex

`app/search/page.tsx:17-25` `generateMetadata` sets `title: \`Search: ${q}\``
and a `q`-templated description, with no `robots` field. `app/robots.ts:4-9`
issues a blanket `allow: "/"` with no Disallow for `/search`. The same pattern
holds for `/songs?q=…` (`app/songs/page.tsx:12`, no per-request metadata) and
`/venues?q=…` (`app/venues/page.tsx:11-14`). Any external link with an
arbitrary `?q=` becomes an indexable, thin, near-duplicate landing page — the
exact anti-pattern Google Search Central's "Manage crawling" and Bing's
Webmaster Guidelines both call out.

The blast radius on this site is bounded (no internal links point at
`?q=` URLs — the search box and filter forms are client-side / GET forms with
no pre-baked query links), so the risk is externally-seeded URLs
(shared links, referrer indexing, someone linking `/search?q=<song>`) rather
than runaway crawl amplification. Still, the fix is one line, and it also
closes a small SEO-hygiene surface where an attacker-controlled `?q=` becomes
a verbatim `<title>` and `<meta description>` in Google's index.

**Fix.** In `/search`'s `generateMetadata`, return
`robots: { index: false, follow: true }` unconditionally (empty landing page
included — it's an input surface with no ranking content). Convert
`/songs`/`/venues` to `generateMetadata({ searchParams })` and return the same
`robots` block when `q` is non-empty. `follow: true` preserves crawl of the
outbound links to real entity pages. Belt-and-braces `Disallow: /search` in
`robots.ts` is fine but strictly redundant with the meta tag; don't add both
under the same user-agent because a hard Disallow prevents Google from ever
reading the noindex.

### 5. `/shows` filter cube (year × tour × dir × per × page) is fully indexable

`app/shows/page.tsx:22-32` `generateMetadata` returns only `title`. The tour
filter never surfaces in the title at all. Every filter combination is
crawlable via the year pills (`app/shows/page.tsx:151-156`), tour pills
(181-185), per pills (193-195), sort toggle (168-173), and pagination
(227-253) — Googlebot doesn't need to guess these URLs, the site's own nav
graph hands them over. Same shape on `/songs` (7 sorts × 3 facets × page) and
`/venues` (sort=name × q).

Every combination ships identical `<title>Shows · Goose Index</title>` and
inherits the root description. Even setting SEO impact aside for a niche
non-commercial site, this is where P0-1's `alternates.canonical` earns its
keep — pointing `/shows?year=Y` at `/years/${year}` and `/shows?tour=T` at
`/tours/${tourId}` consolidates the surface without adding a single Disallow.

**Fix.** Two moves, both in `generateMetadata`:

1. When `year || tourId || (dir !== SHOWS_DEFAULT_DIR) || (per !== SHOWS_DEFAULT_PER) || (page > 1)` (with defaults from `lib/shows-url.ts:4-6`), return `robots: { index: false, follow: true }` alongside the canonical from P0-1. Same test on `/songs` (sort ≠ played, facet ≠ all, q non-empty, page > 1) and `/venues` (sort ≠ shows, q non-empty).
2. Fold the tour name into the title when tour is set, so the rare filtered variant that _does_ warrant its own SERP presence has a unique `<title>`.

---

## P1 — Real friction, fix soon

### Structured data quality

- **`MusicEvent.location.address` is a flat string, not a `PostalAddress`.**
  `lib/jsonld.ts:5,15-19` calls `locationLine(show.city, show.state, show.country)`
  and passes the joined result as `address`. Google's Event structured-data
  guidance requires a `PostalAddress` with broken-out `addressLocality`,
  `addressRegion`, `addressCountry`. Additionally, `lib/queries/format.ts:49`
  strips "USA" from the display string, so US shows currently emit no country
  facet at all in the JSON-LD. **Fix:** emit
  `address: { "@type": "PostalAddress", addressLocality: show.city ?? undefined, addressRegion: show.state ?? undefined, addressCountry: show.country ?? undefined }`
  directly from show fields (skip the display-side `locationLine`), and also
  set `location["@id"]: \`${SITE_URL}/venues/${show.venueId}\`` when
  `venueId` is present — `ShowDetail.venueId` at `lib/queries/shows.ts:96` is
  already selected. Update the `lib/jsonld.test.ts` fixture in the same PR.
- **`MusicEvent` has no `@id`, `url`, `image`, or `description`.**
  `lib/jsonld.ts:4-25`. These are all `recommended` (not required) properties
  in Google's Event guidance, but `image` is what populates the thumbnail in
  rich results and `url` binds the entity to a canonical page. **Fix:** set
  `@id` and `url` to
  `\`${SITE_URL}${showHref(show.date, show.order)}\``, `image` to the shared
  card at `\`${SITE_URL}/opengraph-image\`` (the file-convention lives at the
  root, not per-show), and reuse the generateMetadata description from
  `app/shows/[date]/page.tsx:52`.
- **`MusicGroup` performer/`about` are anonymous.** `lib/jsonld.ts:22,33` emit
  `{ "@type": "MusicGroup", name: "Goose" }` twice with no `@id`, so the show's
  performer and the site's `about` node are unrelated entities to Google. **Fix:**
  give Goose a stable `@id: SITE_URL + "#goose"` and reference it from both
  places; add a `sameAs` array pointing at the official band URL,
  Wikipedia/Wikidata, and MusicBrainz (**not** elgoose — `sameAs` means "is
  the same entity as", and elgoose is _about_ Goose, not Goose itself).
- **`WebSite` JSON-LD has no `url` or `@id`.** `lib/jsonld.ts:27-35`. Not a
  rich-result gate (Google deprecated the sitelinks searchbox in late 2024, so
  `potentialAction: SearchAction` no longer earns a SERP feature) but adding
  `url: SITE_URL` and `@id: SITE_URL + "#website"` is cheap graph hygiene that
  lets per-page nodes cross-reference.
- **Only show pages emit entity JSON-LD.** Grep of
  `application/ld+json|JsonLd` across `app/` returns only `app/layout.tsx`
  (siteJsonLd) and `app/shows/[date]/page.tsx` (showJsonLd). Highest-value
  additions for this site: a `MusicVenue` on `/venues/[id]` with `event: [MusicEvent…]`
  (documented `event carousel` shape), an `EventSeries` on `/tours/[id]` with
  `subEvent: [MusicEvent…]`, and `ItemList` on `/years/[year]` and
  `/on-this-day`. Emit the JsonLd tag **after** the `notFound()` check on
  every page (`app/shows/[date]/page.tsx:83,102` already does this correctly).
- **`BreadcrumbList` JSON-LD is nowhere.** The visible `<Breadcrumb>` component
  is already used at many call sites (`app/songs/[slug]/page.tsx:64,89`,
  `app/venues/[id]/page.tsx:49`, etc.) and the trail array is already
  assembled. `lib/jsonld.ts` grows a `breadcrumbJsonLd(trail)` helper, and
  `<Breadcrumb>` co-emits it. This is the JSON-LD Google actually renders as
  styled crumbs above the SERP snippet.
- **Fancy experience lacks a visible breadcrumb on most entity pages.** Only
  `app/songs/[slug]/page.tsx:89` fancy renders the full `<Breadcrumb>`;
  shows/[date] (`app/_components/show-header.tsx:107-125`), venues/[id]:84-86,
  tours/[id]:69-71, years/[year]:68-70, and stats/[cut]:66-70 render a
  single-link "eyebrow" instead. Google requires visible breadcrumbs to match
  BreadcrumbList markup — either fix this first, or add BreadcrumbList only on
  the pages whose visible crumb is real (songs today) until the eyebrow is
  promoted. The fancy visual language should extend, not the crumb component
  should replace: add `[data-experience="fancy"] .doc-crumb {…}` styling so
  the trail stays in almanac voice, and preserve the staggered `.rise`
  animation on the hero.

### Canonicalization edge cases (bundle with P0-1)

- **`/on-this-day` and `/no-show`-on-date pages.** The soft-landing "No show
  on YYYY-MM-DD" page (`app/shows/[date]/page.tsx:64-73`) deliberately
  returns 200 for good UX but is fully indexable, so every valid calendar date
  is a potential landing. Add `robots: { index: false, follow: true }` to the
  no-show branch of `generateMetadata` — humans still get the friendly page,
  crawlers stop accumulating thin dates. Users can still navigate the outbound
  links (year page, On This Day, nearest neighbors) thanks to `follow: true`.
- **Pure "not found" branches.** `app/songs/[slug]/page.tsx:19`,
  `app/venues/[id]/page.tsx:20`, `app/tours/[id]/page.tsx:18-20`, and the
  "Show not found" case at `app/shows/[date]/page.tsx:49` return
  `{ title: "… not found" }` and inherit the root description. Once the
  soft-404 issue (`docs/reviews/2026-07-10-ux-ui-review.md:325-337`) is fixed
  these become real 404s and metadata is moot, but `robots: { index: false }`
  is cheap defense-in-depth until then.

### Core Web Vitals hooks

- **Home LCP element (h1) is opacity-animated → LCP registers late.**
  `app/page.tsx:92-97` renders the hero `<h1>Every Goose show, indexed.</h1>`
  with `className="rise"` and `style={{ animationDelay: "60ms" }}`.
  `.rise` at `app/globals.css:219-235` animates opacity 0 → 1 over 720ms with
  `animation-fill-mode: both`, so the h1 sits at opacity 0 for the delay
  window. Chrome's LCP algorithm excludes fully-transparent elements as
  candidates — realistic added delay is ~60ms plus one animation frame, not
  the full 720ms, but the element is a legitimate LCP candidate on the
  marketing home. **Fix:** exclude the h1 from `.rise` (or split into a
  translate-only keyframe that pins opacity to 1) so it registers as LCP on
  first paint. Keep the sequenced fade on the eyebrow, description,
  SearchBox, and stats grid — none of them are LCP candidates. Functional
  and minimal modes already null `.rise` (`globals.css:445-450`); only fancy
  needs the fix.
- **`ScrollTable` inserts a swipe-hint above the table after hydration → CLS
  on `/songs`.** `app/_components/song/scroll-table.tsx:10` initializes
  `overflows=false`, so SSR emits no hint; the `useEffect` at :13-22 measures
  overflow after mount and re-renders inserting `<p class="song-scroll-hint">`
  (:26) as a block-level sibling above the scroller. `globals.css:494` styles
  it as a normal-flow block with `margin: 0 8px 5px` — no `position:
  absolute`, no reserved height — so the whole table below shifts. Practical
  CLS contribution is small (~0.02 on a mobile viewport, well inside "Good"
  by itself), but the fix is trivial and it removes a real hydration wobble.
  **Fix:** the surrounding `.song-scroll` already has `position: relative`
  (`globals.css:491`), so make `.song-scroll-hint` `position: absolute` inside
  it. Zero layout shift, no aesthetic change.

### Sitemap freshness signals

- **Sitemap emits no `lastModified`.** `app/sitemap.ts:17` builds every entry
  as `{ url }` only. Google largely ignores `changeFrequency` and `priority`
  in 2026 but does still use `lastModified` to steer recrawl. For a site
  whose content genuinely changes (nightly sync, mid-tour setlist
  corrections, live-show updates), an honest lastmod on show/song/year/hub
  URLs meaningfully improves how quickly corrections propagate.
  `db/schema.ts:44-45` shows `shows.updatedAt` already exists (as text) and
  `db/repository.ts:66` shows the nightly upsert propagates it. **Fix:**
  extend the sitemap queries in `lib/queries/sitemap.ts` to also project
  timestamps: `MAX(shows.updated_at)` per group for shows (grouped by date),
  songs, venues, tours, and years. `/on-this-day` can just use `new Date()`.
  Parse the text column defensively before passing to `new Date(...)` — pass
  `undefined` on failure rather than an Invalid Date.
- **Sitemap is `force-dynamic`.** `app/sitemap.ts:7` runs the five queries on
  every crawl. The URL set only changes during the nightly sync, so
  `export const revalidate = 3600` (or `86400`) is safer and cheaper. Sitemap
  doesn't read the experience cookie, so the `force-dynamic` at the layout
  isn't binding here — this one route can genuinely go on ISR.
  Optionally trigger `revalidatePath('/sitemap.xml')` from the sync route for
  on-demand freshness.

### `robots.ts` hygiene

- **Zero Disallow rules today** (`app/robots.ts:4-9`, single
  `{ userAgent: "*", allow: "/" }`). Add `disallow: ["/api/", "/search"]`
  under the wildcard user-agent — `/api/live` is the only route under `/api/`
  today (`app/api/live/route.ts`) and it's a public JSON endpoint that can
  never rank, so any crawl of it is pure waste. The `/search` line is
  belt-and-braces with P0-4's noindex; only add it if the site is OK not
  serving link-equity flow through `/search` externally-linked results (most
  sites are).
- **Make a deliberate call on AI training crawlers.** No per-agent rule
  exists in the tree for GPTBot, ClaudeBot, `anthropic-ai`, Google-Extended,
  CCBot, PerplexityBot, Amazonbot, or Bytespider. This is a maintainer
  posture question, not an SEO defect — Google Search and Bing are entirely
  unaffected — but a fan companion to elgoose.net is exactly the kind of
  downstream site where a deliberate statement is more appropriate than a
  default-allow. Whichever direction you pick, put it in `robots.ts` so the
  choice is visible.

---

## P2 — Polish

- **Sitemap homepage URL is `${SITE_URL}` with no trailing slash**
  (`app/sitemap.ts:19` `page("")`). Change to `page("/")` to match every
  other row.
- **`WebSite` node is emitted on every page including entity pages.**
  `app/layout.tsx:81`. Not a bug — Google dedupes it — but each entity page
  could also carry a page-scoped `WebPage`/`ItemPage`/`CollectionPage` with
  `mainEntity` and `isPartOf: { "@id": SITE_URL + "#website" }` to tie the
  graph together. Low priority; ship after P1's per-entity JSON-LD.
- **`showJsonLd.workPerformed` drops set/encore structure and jam metadata.**
  `lib/jsonld.ts:23` emits `{ "@type": "MusicComposition", name: e.song }`
  only. `SetlistEntry` at `lib/queries/shows.ts:115-134` already carries
  `slug`, `songId`, `setType`, `setNumber`, `position`, `transition`,
  `isJam`, `isReprise`, `gap`. Add `@id`/`url` per song (using slug),
  `composer` (Goose `@id` for originals, `{ "@type": "MusicGroup", name: e.originalArtist }`
  for covers), and `additionalProperty: [PropertyValue…]` for the jam-band
  metadata. Also add a running `position: i + 1` across the flat array
  (SetlistEntry.position is intra-set, not global).
- **`MusicEvent.startDate` is date-only.** `lib/jsonld.ts:10`. Where a doors
  or start time is known, prefer a datetime with timezone offset; otherwise
  keep date-only and optionally add `endDate: show.date` so Google infers
  all-day. Do not default to UTC midnight — that's wrong for a west-coast
  show and misleads timezone-aware consumers.
- **`showJsonLd` drops `location` entirely when venue is null**
  (`lib/jsonld.ts:13-21`). Google's Event schema requires `location`. Emit a
  placeholder `{ "@type": "Place", name: locationLine(city, state, country) || "Unknown venue" }`
  so the validator stays green even on partial data.
- **JSON-LD escaping is minimal** — `app/_components/json-ld.tsx:3` escapes
  only `<`. Extend to also escape `>`, `&`, U+2028, U+2029 — Next.js's own
  approach for inlined data. Cost: one longer `.replace()` chain.
- **IBM Plex Sans (3 weights) and IBM Plex Mono (2 weights) are loaded but
  never used.** `app/layout.tsx:2,30-41,76` declares and attaches both to
  `<html>` but no CSS consumes `--font-plex-sans` / `--font-plex-mono`
  (grep across `app/globals.css` and components confirms). At most this
  ships wasted CSS bytes in the critical stylesheet plus wasted build
  artifacts (next/font only preloads faces actually referenced). Delete the
  imports, the declarations, and the two `.variable` slots on `<html>`.
  Remove the misleading comment at `app/layout.tsx:29` while you're there.
- **Non-fancy experiences still load Bricolage / Hanken / JetBrains.**
  `app/layout.tsx:76` applies the fancy font variables unconditionally, but
  `globals.css:287-289` (functional) and `:406-408` (minimal) override
  `--type-*` to system fonts. Gate the fancy fonts behind
  `experience === "fancy"` in the layout. Non-fancy readers stop paying for
  three variable-weight webfonts they never render.
- **List page titles/descriptions are static across filter state.**
  `/shows?tour=15` shows a generic "Shows" title even though the tour name
  is known; `/on-this-day` (`app/on-this-day/page.tsx:10`), `/stats/[cut]`
  (`app/stats/[cut]/page.tsx:27-29` — the "· Stats · Goose Index" stacking
  is also mild redundancy with the site template), paginated `/songs?page=N`
  variants all inherit the root description. Add tour-scoped titles/
  descriptions on `/shows` (already known — pattern reuses `allTours.find`
  at line 65), and simple "— page N" title appends on paginated variants
  (paired with self-canonical to prevent duplicate-content demotion).
- **Setlist song links use raw `<a>`, not Next `<Link>`.**
  `app/_components/setlist/minimal.tsx:32` and
  `app/_components/setlist/functional.tsx:92`. Not an SEO issue (Google
  crawls `<a href>` fine) but every click forces a full navigation instead
  of a client transition — perceived performance and INP take a hit on the
  highest-traffic page type. Same-page hash refs at `<a href="#…">` stay as
  raw anchors.
- **OG image alt on entity pages is the site tagline.** `lib/site.ts:23`
  spreads the parent's `openGraph.images` verbatim, and
  `app/opengraph-image.tsx:5` sets `alt = "Goose Index — every show, indexed."`
  — every entity share card announces the tagline instead of the entity to
  assistive tech. Optional: in `entityOpenGraph`, remap `images.alt` to
  `opts.title`. Skip if per-entity OG images are planned later.
- **`openGraph.type` is `"website"` on show pages that emit MusicEvent
  JSON-LD.** `lib/site.ts:22`. Extending `entityOpenGraph` to accept
  `type?: string` and passing `"music.event"` from show pages produces
  richer previews on platforms that read the OG music vocabulary — pure
  upside if you want to spend a slot on it.
- **Home hero fade cascade — separate from the LCP fix in P1.**
  `app/page.tsx:89-117` staggers `.rise` across eyebrow / h1 / description /
  SearchBox / stats grid (0/60/120/180/260ms). After the P1 h1 fix, the
  visible hero still completes at ~260ms + 720ms ≈ ~980ms. Consider a
  transform-only variant of `.rise` for the LCP-adjacent tiles so a stats
  number never accidentally becomes LCP with a 260ms delay attached.
- **Home page description is very slightly over 155 characters**
  (`app/layout.tsx:47-48`). SERPs will truncate; the OG description
  (`:56-57`) is fine at OG's higher limit. Optional trim.
- **`/on-this-day` has no meta description** (`app/on-this-day/page.tsx:10`).
  Add e.g. "Every Goose show that fell on today's calendar date, across
  every year on the record." — matches the almanac voice and gives Google a
  stable snippet signal.
- **`/stats/[cut]` titles read "Most Played · Stats · Goose Index".**
  `app/stats/[cut]/page.tsx:27-29`. Drop the ` · Stats` suffix; the site
  template already adds " · Goose Index".
- **Global `dynamic = "force-dynamic"` prevents edge caching of HTML.**
  `app/layout.tsx:64`. This is a real cacheability concern, but a naive
  `revalidate = 3600` swap won't take effect — every page (and the layout)
  calls `getExperience()`/`cookies()` (`lib/experience.server.ts:4-7`,
  every page.tsx) which is a Dynamic API and forces per-request rendering
  regardless of ISR config. The honest fix is to wrap the read-only Neon
  queries in `unstable_cache` with tag-based invalidation from the sync
  route — a data-layer change, not a segment-config change. It's also
  entangled with the soft-404 issue at
  `docs/reviews/2026-07-10-ux-ui-review.md:325-337`, and the fix there
  (scoping `force-dynamic` to routes that truly need it) unlocks this. Left
  as polish because the cookie-driven experience system is the reason the
  layout is force-dynamic in the first place; changing that needs a
  design-level decision.

---

## Suggested sequencing

| Order | Theme | Items |
|---|---|---|
| 1 | Canonical foundation | P0-1 alternates.canonical helper on every metadata export; P0-2 thread `showHref(date, order)` through the show-page metadata path |
| 2 | Honest share cards | P0-3 `entityOpenGraph` on every list page (convert static metadata to `generateMetadata` with `parent`) |
| 3 | Close indexability leaks | P0-4 noindex on /search, /songs?q=, /venues?q=; P0-5 noindex on non-default /shows facets; P1 no-show-date noindex |
| 4 | Structured data quality | PostalAddress on MusicEvent; @id/url/image/description on MusicEvent; canonical MusicGroup with @id/sameAs; per-entity JSON-LD (MusicVenue with `event`, EventSeries, ItemList); BreadcrumbList |
| 5 | Sitemap freshness | lastModified on entity URLs; drop force-dynamic on sitemap; optional on-demand revalidate from sync |
| 6 | Robots hygiene | Disallow /api/; deliberate AI-crawler posture; homepage trailing slash |
| 7 | Core Web Vitals | h1 out of `.rise` on home; ScrollTable hint to `position: absolute`; delete unused IBM Plex fonts; gate fancy fonts behind experience === "fancy" |
| 8 | Long tail polish | Everything in P2 that's still open |

---

## Non-issues we deliberately checked

Recording these so they don't get re-audited later:

- **www vs apex.** `SITE_URL` in `lib/site.ts:6` commits to
  `https://www.gooseindex.com`; the file comment documents that apex 307s to
  www at the Vercel edge. Sitemap URLs and OG URLs are all on the canonical
  origin. No 307 hop per crawl, no host-collision index bloat.
- **Sitemap discoverability.** `app/robots.ts:8` advertises
  `${SITE_URL}/sitemap.xml`. No Search Console registration required.
- **Sitemap coverage.** Every indexable entity type is enumerated
  (`app/sitemap.ts:19-27`), and the sitemap correctly excludes `/search`,
  `/api/*`, and `?n=` show variants. No canonical-URL leakage.
- **JSON-LD script escaping.** `app/_components/json-ld.tsx:1-5` escapes
  `<` to `<`, blocking `</script>` breakout. Sufficient for XSS even
  with fan-contributed setlist/song/venue text flowing through elgoose.
- **`metadataBase` and OG image survival.** `app/layout.tsx:45` sets
  `metadataBase`; `entityOpenGraph` at `lib/site.ts:23` re-attaches
  `parent.openGraph.images` so the file-convention
  `app/opengraph-image.tsx` card survives Next's wholesale-replacement
  semantics on entity pages.
- **Cross-mode cache split.** Cookie-driven experience selection does not
  create a canonicalization hazard — `app/layout.tsx:64` pins the tree to
  `force-dynamic`, so Vercel Edge never serves a cross-mode-cached response.
  Crawlers uniformly see the fancy mode. Documented in
  `docs/superpowers/specs/2026-06-27-experience-modes-design.md:150`.
- **Mobile/desktop content parity.** The desktop `<nav>` renders
  unconditionally in the DOM with a CSS-only hide
  (`hidden md:flex`, `app/_components/site-header.tsx:34`) — Googlebot's
  mobile crawler sees the same links as desktop. No cloaking risk.
- **Soft-404 from global `force-dynamic`.** Already logged in
  `docs/reviews/2026-07-10-ux-ui-review.md:325-337`. Not re-listed here;
  it's the single biggest SEO issue on the site and gates several fixes in
  this review, but the fix is architectural (scope `force-dynamic` off the
  layout) rather than an SEO-metadata change.

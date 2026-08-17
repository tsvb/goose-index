# Pen & Instrument — Plan 3 of 5: The Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate every remaining 3.0 page surface — shows browse, show page, songs, song page, venues, tours, years, on-this-day, search, 404, loading states — onto the pen & instrument forms, and retire `ShowCard`/`ShowRow`/`ShowList`/`SectionHeader` and the almanac stamp CSS.

**Architecture:** One new shared file (`page-chrome.tsx`: PageHead, FilterLink/FilterRow, FolioNav, NilState) plus one small forms change (venue-context weekday), then page-by-page migration in consumer order so each shared component's LAST migrating consumer retires it. Charts and instruments (`CareerChart`, `TourTimeline`, `VenueMap`, song charts, `SetTape`) are **plan 4's** — this plan re-tempers around them, never inside them. The functional (2.0) and minimal (1.0) branches of every page are untouched except where a page shares fancy markup (accepted interim, as on home).

**Tech Stack:** unchanged. Consumes plans 1–2's kits and forms.

**Spec:** `docs/superpowers/specs/2026-08-16-pen-and-instrument-design.md` · **Ledger:** `sdd/progress.md` (plan-3-assigned items are folded into the tasks below).

## Global Constraints

- Plans 1–2 Global Constraints all bind (AA gate, motion budget, lowercase chrome vs authored casing, deterministic pen, one meaning per color, `renderToStaticMarkup` tests, worktree + port 3100, DB pages verified by fixture tests).
- **Pinned copy is law:** the Explore survey lists test-pinned strings (count lines like "logged · incl. upcoming", truncation copy like "Showing the 24 most recent of 52 matching shows", never-played copy, metadata grammar). Chrome casing may lowercase, but computed copy TEXT survives verbatim unless a step says otherwise. When a test pins old *markup* (pills, `surface-card`, `stage-glow`, `aria-disabled` boxes), rework the expectation, keep the scenario and the copy.
- URL machinery (`lib/shows-url.ts`, query params, `#show-<id>` anchors + `AnchorFlash`, `aria-sort`, hidden form inputs, GET forms) is behavior — preserved exactly.
- Data layer untouched. `getShowEntryNumber` stays (the entry number moves from the stamp to the show folio). JSON-LD, metadata, canonical URLs untouched.
- Each task ends `npm test` + `npm run typecheck` green and committed. Suite baseline: 94 files / 650 tests at `679d510`.

---

### Task 1: Page chrome kit + the venue-context weekday

**Files:**
- Create: `app/_components/page-chrome.tsx`, `app/_components/page-chrome.test.tsx`
- Modify: `app/_components/forms.tsx` (LedgerEntry venue context only), `app/_components/forms.test.tsx`

**Interfaces (produced; every later task consumes these exactly):**
- `PageHead({ kicker, title, meta, children }: { kicker?: string; title: React.ReactNode; meta?: React.ReactNode; children?: React.ReactNode })` — page opening: lowercase kicker (`text-[0.7rem] lowercase text-faint`), h1 (`text-[1.7rem] font-semibold tracking-tight sm:text-4xl`), mono meta line, optional children (filters), then `<PenRule seed={…}>`? No — PageHead draws NO rule itself; pages place `SectionRule`/`PenRule` as needed. Wrapped in nothing: the caller supplies `<Container>`.
- `FilterLink({ href, active, children })` — lowercase text filter: active = `text-steel underline underline-offset-4 font-semibold`, inactive = `text-muted underline underline-offset-4 hover:text-ink`; always mono `text-xs`.
- `FilterRow({ label, children })` — one wrapping flex row of FilterLinks with an optional lowercase mono label.
- `FolioNav({ prevHref, nextHref, prevLabel = "previous", nextLabel = "next", center })` — the folio pagination line: `← previous · {center} · next →`; a missing href renders its side as `aria-disabled="true"` faint text (no box). Mono, text-xs, flex-between.
- `NilState({ children, href, linkLabel })` — nil sentence: muted italic-free text ending in `—`? No: renders `<p className="py-12 text-center text-muted">{children} —</p>` plus optional spruce clear link below. No boxes, no dashed borders.
- forms.tsx change: `LedgerEntry` venue context's sub line becomes `show.tour ?? dp.weekday.toLowerCase()` (the old ShowRow showed the weekday; plan-2's forms dropped it — restore it as the fallback so a tour-less show still shows its weekday).

- [ ] **Step 1: failing tests** — `page-chrome.test.tsx`: PageHead renders kicker lowercase + exactly one h1 + meta; FilterLink active carries `text-steel`+`font-semibold`, inactive doesn't; FolioNav with both hrefs renders two links + center text, with `prevHref` absent renders `aria-disabled="true"` and NO `<a` for that side; NilState contains the child text, the trailing `—`, and the optional link; nothing anywhere renders `rounded`/`border-`box classes (assert `not.toMatch(/rounded|surface-card/)` on each). forms.test.tsx: venue-context entry with `tour: null` shows the lowercase weekday in the sub slot; with a tour, the tour (existing test keeps passing). Write the actual test code in the repo's `renderToStaticMarkup` style.
- [ ] **Step 2:** run both test files — new ones FAIL (module missing / new expectation red).
- [ ] **Step 3: implement.** `page-chrome.tsx` complete:

```tsx
import Link from "next/link";
import { clsx } from "./clsx";

/** Page opening: lowercase kicker, the title, a mono meta line. No rules,
 * no glow, no motion — sections below start with their own SectionRule. */
export function PageHead({
  kicker,
  title,
  meta,
  children,
}: {
  kicker?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="pt-10 pb-6 sm:pt-14">
      {kicker && <p className="text-[0.7rem] lowercase text-faint">{kicker}</p>}
      <h1 className="mt-1 text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      {meta && <p className="mt-2 font-mono text-[0.75rem] text-faint">{meta}</p>}
      {children}
    </div>
  );
}

/** One text filter. Active wears steel; nothing is a pill. */
export function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "font-mono text-xs lowercase underline underline-offset-4 transition",
        active ? "font-semibold text-steel" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

/** A labeled row of filter links. */
export function FilterRow({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
      {label && <span className="font-mono text-[0.62rem] lowercase text-faint">{label}</span>}
      {children}
    </div>
  );
}

/** Folio pagination line: ← previous · page 2 of 17 · next →. A missing side
 * keeps its slot (aria-disabled) so the line never jumps. */
export function FolioNav({
  prevHref,
  nextHref,
  prevLabel = "previous",
  nextLabel = "next",
  center,
}: {
  prevHref?: string | null;
  nextHref?: string | null;
  prevLabel?: string;
  nextLabel?: string;
  center?: React.ReactNode;
}) {
  return (
    <nav className="flex items-baseline justify-between gap-4 font-mono text-xs lowercase">
      {prevHref ? (
        <Link href={prevHref} className="text-muted underline underline-offset-4 hover:text-ink">
          ← {prevLabel}
        </Link>
      ) : (
        <span aria-disabled="true" className="select-none text-faint opacity-60">← {prevLabel}</span>
      )}
      {center && <span className="text-faint">{center}</span>}
      {nextHref ? (
        <Link href={nextHref} className="text-muted underline underline-offset-4 hover:text-ink">
          {nextLabel} →
        </Link>
      ) : (
        <span aria-disabled="true" className="select-none text-faint opacity-60">{nextLabel} →</span>
      )}
    </nav>
  );
}

/** A nil entry, not an empty box. */
export function NilState({
  children,
  href,
  linkLabel,
}: {
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="py-12 text-center">
      <p className="text-muted">{children} —</p>
      {href && linkLabel && (
        <Link href={href} className="mt-3 inline-block text-sm lowercase text-spruce underline underline-offset-4 hover:text-ink">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
```

forms.tsx: in `LedgerEntry`, `const sub = onVenue ? (show.tour ?? loc) : loc;` becomes `const sub = onVenue ? (show.tour ?? dp.weekday.toLowerCase()) : loc;`.
- [ ] **Step 4:** focused tests PASS, then full gate.
- [ ] **Step 5:** commit `feat(redesign): page chrome kit — head, text filters, folio nav, nil state`.

---

### Task 2: /shows — the first migrated browse page

**Files:** Modify `app/shows/page.tsx` (fancy branch), `app/shows/page.test.tsx`, `app/shows/loading.tsx`; Delete `app/_components/show-list.tsx` + `show-list.test.tsx`.

**Interfaces:** consumes Task 1 + forms. `ShowList`'s only consumer is this page — it retires here. **The `#show-<id>` jump anchors and `AnchorFlash` are behavior**: each ledger entry wraps in `<div id={`show-${s.showId}`} className="show-anchor">` inside the `Ledger` (the `show-anchor` class is the flash hook — keep it).

- [ ] **Step 1: test rework first** (RED): keep every scenario; expectations move to: `PageHead` reality (kicker `goose index · shows` lowercase, h1 `every show`, the PINNED countLine strings verbatim), filters as `FilterLink`s (assert `text-steel` on the active year; the pinned hrefs/`per=100`/`tour=1` all survive), jump link keeps its pinned labels, ledger rows replace `surface-card`/pills (assert absence), `FolioNav` keeps `aria-disabled="true"` both-ends semantics and `Page N of M` center (lowercase `page N of M` — update the pinned string's case only), empty state via NilState keeps "No shows found." + clear-filters link.
- [ ] **Step 2: rewrite the fancy branch:** `PageHead kicker="goose index · shows" title="every show" meta={countLine}`; filters: `FilterRow` years (All + years + `/years/{year}` companion as a plain spruce link), conditional `FilterRow label="tours"`, `FilterRow label="per page"` + sort FilterLink (`flipDirLabel.toLowerCase()`) + jump link (spruce, keeps label casing "Tonight’s show"/"Most recent show" — authored? No, chrome → lowercase both, update pinned strings' case in test); a strong `PenRule` between filters and the ledger; the list: `Ledger seed="shows"` of `<div id={…} className="show-anchor"><LedgerEntry show={s} /></div>`; `NilState href="/shows" linkLabel="clear filters">No shows found.</NilState>`; `FolioNav center={`page ${compact(page)} of ${compact(totalPages)}`}`. Delete the local `pillClass`. Minimal branch untouched.
- [ ] **Step 3:** delete `show-list.tsx` + its test; `grep -rn "ShowList\|show-list" app lib` → only this page's removed import may remain in git history, zero live hits.
- [ ] **Step 4:** `loading.tsx`: `SkeletonPills(11)` → a `SkeletonBar` row of text-ghost widths (keep the component call `SkeletonPills` — it's already de-pilled); leave otherwise.
- [ ] **Step 5:** gates; commit `feat(redesign): shows browse on the ledger — text filters, folio pagination, nil state`.

---

### Task 3: The show page — folio, notes, setlist re-temper

**Files:** Modify `app/shows/[date]/page.tsx`, `app/_components/show-header.tsx` (fancy branch), `app/_components/setlist/fancy.tsx`, their tests, `app/globals.css` (delete `.entry-stamp`/`.entry-folio`/`.almanac-masthead`/`.almanac-nameplate` rules + the `display:none` hook + fix its comment).

**Interfaces:** consumes Task 1 kit + `PenRule`/`PenNote`. `getShowEntryNumber` is re-consumed by the new folio. `SetTape`, `SetlistFunctional`, `SetlistMinimal`, `nugs-*` classes untouched (plan 4/5).

- [ ] **Step 1 (tests first, RED):** show-header.test: fancy expectations → no `stage-glow`, no `almanac-masthead`, no `entry-stamp` markup at all (the number moved; scenario "entry number renders" moves to the page test), kicker lowercase, one h1 (the date, authored casing kept — dates render as computed "August 12, 2026" title-case: that is DATA, keep it), nugs links + zero-state scenarios unchanged. Page test: siblings render as text links (no `rounded border` chips), notes render inside pen rules with italic body, prev/next cards replaced by ONE folio footer combining prev/next/entry-number: assert `entry no. 823` (lowercase chrome) when entryNumber non-null and its absence when null, both neighbor labels/титles survive; top-bar hover classes steel not gold; NoShowPage: dashed/card classes gone → NilState copy kept.
- [ ] **Step 2: show-header.tsx fancy branch rewrite** (keep minimal/functional): `PageHead`-style markup inline (it has bespoke stat rows — reuse PageHead where it fits: kicker = tour link + weekday lowercase; title = the long date; meta = stat/listen row stays its own flex block below). Drop `stage-glow` div, `almanac-masthead` class, the whole `entry-stamp` block and its prop plumbing — `entryNumber` prop REMAINS on the component signature? No: move `entryNumber` out of ShowHeader entirely (the page's folio owns it now); update the component signature and both call sites (page + test).
- [ ] **Step 3: page furniture:** top bar link hovers `hover:text-ink` (drop gold); sibling chips → `text-spruce underline` inline links; notes aside →
```tsx
<aside className="show-notes-aside mb-10">
  <PenRule seed={`notes-${date}`} />
  <p className="my-3 text-[0.7rem] lowercase text-faint">from the notes</p>
  <p className="leading-relaxed italic text-ink">{show.notes}</p>
  <PenRule seed={`notes-b-${date}`} className="mt-3" />
</aside>
```
(the `.show-notes-aside` class stays in the markup as a stable hook; delete its old card styles nothing — they lived in the deleted theme CSS); prev/next section (both spots) → one folio footer:
```tsx
<footer className="border-t border-line-soft">
  <Container className="py-6">
    <FolioNav
      prevHref={neighbors.prev ? showHref(neighbors.prev.date, neighbors.prev.order) : null}
      nextHref={neighbors.next ? showHref(neighbors.next.date, neighbors.next.order) : null}
      prevLabel={neighbors.prev ? `${formatShortDate(neighbors.prev.date)}` : "previous"}
      nextLabel={neighbors.next ? `${formatShortDate(neighbors.next.date)}` : "next"}
      center={entryNumber != null ? `entry no. ${entryNumber}` : undefined}
    />
  </Container>
</footer>
```
NoShowPage's card → `NilState`. Keep `title=` tooltips (prevLabel/nextLabel context) by passing them through — extend FolioNav? No: wrap FolioNav usage with plain links here if titles are pinned; check the test — if `title=` attributes are pinned, add `prevTitle`/`nextTitle` optional props to FolioNav in this task (update its test).
- [ ] **Step 4: setlist/fancy.tsx re-temper (accents only, structure untouched):** segue caret `text-gold` → `text-steel`; the gold rail/`before:bg-gold/45` markers → steel; the Dusted-Off pill (`rounded-full border-ember/45 … text-ember`) → a pen margin note: `<PenNote className="ml-2 inline">first in {e.gap} shows</PenNote>` (computed copy, rule 5; keep the `title` attr). Jam/ember duration accents: leave `text-ember`/`bg-ember` as-is (ember = text-safe heat since plan 1's retune; plan 4 revisits with the tape). Update the fancy setlist test's pinned classes (`text-gold` caret count → `text-steel`; pill markup → pen note text).
- [ ] **Step 5: CSS deletions** in globals.css: the `.entry-stamp/.entry-folio/.almanac-nameplate` display:none hook (now truly consumer-less — verify `grep -rn "entry-stamp\|entry-folio\|almanac" app` returns nothing before deleting), `.almanac-masthead` mentions in comments. Run `npx vitest run app/globals-contrast.test.ts` (unaffected, but cheap).
- [ ] **Step 6:** gates; commit `feat(redesign): the show page — folio with entry number, pen-ruled notes, steel setlist`.

---

### Task 4: /songs and the song page

**Files:** Modify `app/songs/page.tsx` (fancy branch), `app/songs/page.test.tsx`, `app/songs/loading.tsx`, `app/songs/[slug]/page.tsx` (fancy), `app/songs/[slug]/loading.tsx`, `app/_components/song/appears-on.tsx` (fancy branch), their tests.

**Interfaces:** consumes Task 1 kit + SectionRule. `SongIndexTable`/`PerformanceTable`/`FactRibbon`/charts/`ScrollTable` internals untouched (plan 4); only page furniture moves.

- [ ] **Step 1 (tests RED):** songs page test — hidden-input carry-through, `aria-label="Filter songs by name"`, `aria-sort`, exact sort/facet/pager hrefs ALL survive; pill/box assertions → FilterLink/FolioNav reality; functional `gel` button scenario untouched (shared markup — the fancy input restyle must keep the functional branch's own form: check the file, the forms are separate branches already). Song page test — heading discipline (`<h1>`×1, `<h2>` present) survives with SectionRule h2s; never-played copy verbatim inside NilState; metadata grammar untouched.
- [ ] **Step 2: songs browse:** PageHead (kicker `goose index · the catalog` → lowercase "the catalog", h1 "songs", meta = computed count line as-is), sort row + facet row as FilterRows, the fancy filter input → underline style (mirror search-box classes), `PenRule`, `SongIndexTable` as-is, FolioNav. Overdue note: keep copy, restyle to `PenNote` (it is exactly a computed caveat).
- [ ] **Step 3: song page:** breadcrumb stays `Doc`-free text (fancy branch): restyle crumb links spruce; the tag pill → plain lowercase mono text (`cover · debuted 2016` style, no border); section headings ("Plays per year", "Set placement", "Gaps & returns", "Longest versions", "Top venues", "Every performance") → `SectionRule` (lowercase titles, seeds per section); `NeverPlayed` dashed box → `NilState` with the pinned copy verbatim + both links; `AppearsOn` fancy rows: drop `rounded border …hover:border-sage` card classes → text rows with spruce hover-underline (keep `.eyebrow` replacement: lowercase faint label).
- [ ] **Step 4: loadings:** songs loading unchanged shape; song-slug loading's 8 `surface-card` fact ghosts → plain `SkeletonBar`s.
- [ ] **Step 5:** gates; commit `feat(redesign): songs pages — text filters, ruled sections, nil never-played`.

---

### Task 5: Dimensions, on-this-day, search, 404

**Files:** Modify `app/venues/page.tsx`, `app/venues/[id]/page.tsx`, `app/tours/page.tsx`, `app/tours/[id]/page.tsx`, `app/years/page.tsx`, `app/years/[year]/page.tsx`, `app/on-this-day/page.tsx`, `app/search/page.tsx`, `app/not-found.tsx`, their existing tests (venues ×2, tours-detail, years-index, search, not-found), `app/search/loading.tsx`.

**Interfaces:** consumes Task 1 kit + forms + SectionRule. `VenueMap`/`TourTimeline`/`CareerChart` render as-is (plan 4). After this task `ShowCard`, `ShowRow`, and `SectionHeader` have zero consumers — Task 6 deletes them.

Per page (fancy branches only; minimal untouched):
- [ ] **venues index:** PageHead; map section under a SectionRule ("where they play"); sort toggle + filter form → FilterLink + underline input; jump nav stays (`aria-label="Jump to state"` — restyle links spruce); grouped `surface-card` grids → per-group `SectionRule` (sticky h2 kept: `sticky top-[calc(3.5rem+6px)] bg-paper` — match the real header height) + `Ledger` of text rows (venue name ink + hover underline, meta faint; the pinned group anchors `id="g-co"` etc. and in-group city truncation copy survive). Empty state → NilState ("No venues match." + clear link pinned).
- [ ] **venue detail:** PageHead (kicker = "venues" spruce link line, h1 venue, meta = pinned stat line); `surface-card px-2` wrapper → `Ledger` of `LedgerEntry context="venue"` (the restored weekday sub from Task 1 covers the tour-less rows; pinned "August 30, 2024"-in-display-slot expectation becomes the lowercase "aug 30, 2024" — update the pinned string).
- [ ] **tours index:** drop the dead `SectionHeader` import; PageHead; timeline under SectionRule ("the touring year"); the grouped list → year `SectionRule`s (lowercase year + spruce `/years/{y}` link) + `Ledger` of tour text rows.
- [ ] **tour detail:** PageHead; `Ledger` of `LedgerEntry context="tour"` (pinned: tour name exactly once — the forms already drop the per-row tour in tour context).
- [ ] **years index:** PageHead; CareerChart under SectionRule ("the shape of it"); the year list → `ContentsRow` per year (label = the year, sub = the pinned counts text verbatim).
- [ ] **year detail:** PageHead (the giant `text-[7rem]` year shrinks to PageHead's h1 scale; kicker "years" link; meta = stat line); prev/next year nav → `FolioNav center={<a href="/years">all years</a>}`? FolioNav's center takes ReactNode — pass the all-years spruce link; `Ledger` of plain `LedgerEntry`. (No test file exists — add ONE colocated smoke test in the repo style: fancy renders one h1 with the year, N ledger entry hrefs, no surface-card.)
- [ ] **on-this-day:** PageHead (Calendar icon dropped; kicker "on this day", h1 = computed date title as authored casing? It's a date — keep computed formatting, lowercase the kicker only); ShowCard grid → `Ledger` of `LedgerEntry`; empty state stays plain text (add nothing). Add ONE smoke test (none exists): renders the ledger hrefs for fixture rows, no ShowCard classes.
- [ ] **search:** the four `SectionHeader`s → `SectionRule` (lowercase titles, the pinned "Songs · 13" count text moves into the SectionRule title verbatim — case: the pinned string is `Songs · ` used in an ordering assertion; lowercase to `songs · ` and update the two `indexOf` pins consistently); icon-avatar rows → text rows (Disc/MapPin circles die); `surface-card divide-y` → `Ledger`; the year shortcut card → a text row with steel year + spruce link (keep it ABOVE shows — ordering pinned); empty/truncation copy verbatim; hero → PageHead. Loading: rows only, already fine.
- [ ] **not-found:** kicker "404 · off the setlist" (pinned copy, lowercase already), drop `stage-glow` + Feather badge circle + pill CTAs → PageHead + two spruce underline links + a `PenRule`; keep the exact prose (curly apostrophe pinned); update fancy/functional test expectations (`stage-glow` absence!), minimal untouched.
- [ ] Gates; commit `feat(redesign): dimensions, on-this-day, search, and 404 on the ledger`.

---

### Task 6: Retirements + checkpoint

**Files:** Delete `app/_components/show-card.tsx`, `show-card.test.tsx`, `section-header.tsx`, `section-header.test.tsx`; Modify `app/globals.css` (`.show-anchor` keep; delete now-dead `.rise`-era leftovers if any, `.live-pill` if consumer-less — verify), `sdd/progress.md`.

- [ ] **Step 1:** `grep -rn "ShowCard\|ShowRow\|SectionHeader\|show-card\|section-header" app lib` → zero live hits, then delete the four files.
- [ ] **Step 2:** `grep -rn "live-pill" app` — if only globals.css defines it with no consumer, delete the rule (the TonightEntry owns live now); keep `.live-dot` only if something still renders it (grep).
- [ ] **Step 3:** full gate: `npm run typecheck && npm test && npm run build`.
- [ ] **Step 4:** visual smoke on 3100 (404 + /blog fog/slate as before; DB pages remain fixture-verified).
- [ ] **Step 5:** ledger update + commit `feat(redesign): retire the card components — the index has no cards left`.

Whole-plan-3 review follows (controller dispatches; most capable model), then plan 4.

---

## Self-review (author's, applied)

- **Coverage vs spec page-by-page:** every listed page lands; charts/instruments explicitly deferred to plan 4; 2.0 re-cut and alias death to plan 5. The three plan-3-assigned ledger items are folded in (weekday: Task 1; almanac CSS + stamp: Task 3; getLedgerEntryCount: re-consumed by Task 3's folio).
- **Pinned-copy audit:** every pinned string from the survey is either preserved verbatim or its case-only change is called out in the owning task (shows countLine, search ordering pins, venue date slot).
- **Consumer-ordered retirement:** ShowList dies in Task 2 (last consumer /shows); ShowCard+ShowRow+SectionHeader die in Task 6 after Tasks 3–5 migrate on-this-day, search, and the dimension details; entry-stamp CSS dies in Task 3 with its markup.
- **No placeholders:** Task 1 carries complete code; Tasks 2–5 are transformation specs against components whose complete code shipped in plans 1–3 Task 1, with novel JSX (notes aside, folio footer) written out; test steps name the exact pinned strings and the exact expectation changes.

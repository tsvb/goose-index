# Pen & Instrument — Plan 4 of 5: The Instruments

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-token every chart and instrument onto the pen & instrument roles (their FORMS stay — README's chart rules are law), de-card the last three `surface-card` sites (stats hub, stats loading, blog index), migrate the stats and blog chrome, fix the live/now text-contrast split, and land the carried plan-3 assignments.

**Architecture:** The color roles get their final, precise split for data marks: **steel = the field/structure** (normal bars, tracks, rings, splices — what was gold); **hand = the reading/answer/now** (peak year, hottest spoke, busiest run, hottest state, the live dot — what was ember-as-peak); **ember = heat and overdue, and the ONLY amber that may color TEXT** (red zones, >365-day rings, jam tape, "live"/"tonight" words — AA-safe by plan 1's retune); **spruce = links**; **pencil = the margin**. Hand is a mark-only token (3:1); any amber TEXT must be ember (4.5:1). Chart geometry, evidence channels, and figcaptions are untouched except where a caption names a color that changed.

**Tech Stack:** unchanged. **Spec:** `docs/superpowers/specs/2026-08-16-pen-and-instrument-design.md` · **Survey:** the plan-4 Explore report (chart-by-chart token map) · **Ledger:** `sdd/progress.md`.

## Global Constraints

- Plans 1–3 Global Constraints all bind (AA gate, motion budget, lowercase chrome vs authored/data casing incl. the new casing-boundary rule, deterministic pen, `renderToStaticMarkup` tests, worktree + port 3100, minimal branches untouched, pinned copy verbatim).
- README "How the charts work" rules are law: form follows the number; **colour means exactly one thing per section**; a claim never travels without its evidence. A change that breaks one is a bug even if it renders.
- The mark/text amber split above is a Global Constraint: `text-hand` may not style running text anywhere; amber text = `text-ember`.
- Chart forms, geometry constants, evidence figcaptions, a11y structures (`role="group"`, aria-labels, text-parity tables) are preserved; only tokens/classes and the named chrome move.
- `rounded-[2px]` on the tour-timeline track/bars and the tape strip is a deliberate instrument-housing choice — KEEP it (record this; plan 5 must not "clean" it).
- Suite baseline: 96 files / 698 tests green at `08cf95c` (+docs commits). Every task ends green (typecheck + tests) and committed; `npm run build` at the checkpoint.

---

### Task 1: Stats chrome — hub ledger, filter nav, kickers

**Files:** `app/stats/page.tsx`, `app/stats/_shell.tsx`, `app/stats/[cut]/page.tsx` (furniture only), `app/stats/loading.tsx`, their tests.

- [ ] Hub (fancy/functional branch): PageHead (kicker lowercase from the current eyebrow text, title, computed meta); the `CUTS` grid of `surface-card … hover:border-gold/55` cards → a `Ledger seed="stats-hub"` of whole-row links styled like ContentsRow (label = cut title lowercase, sub = the live `hubLines()` headline verbatim — it is computed copy; hover = underline only). Minimal branch untouched.
- [ ] `_shell.tsx`: `CutSwitcher` pills (`bg-gold/15 text-gold ring-gold/40`) → `FilterRow` of `FilterLink`s (active steel); eyebrow at ~62 → lowercase kicker text; the `text-gold` at ~47/63/79 → per role (active state steel; links chromeLink; plain emphasis ink).
- [ ] `[cut]/page.tsx` ~151 `text-gold` → role-correct (inspect: if a link → `chromeLink`; if emphasis → `text-ink`).
- [ ] `loading.tsx`: `surface-card p-5` ghosts → plain `SkeletonBar` groups.
- [ ] Tests: keep scenarios; move pinned classes; hubLines strings stay verbatim. Gates; commit `feat(redesign): stats chrome — hub ledger, steel filter nav`.

### Task 2: Shared charts re-token — career, tour timeline, venue map, song charts

**Files:** `app/_components/career-chart.tsx`, `tour-timeline.tsx`, `venue-map.tsx`, `app/_components/song/charts.tsx`, `ribbon.tsx`, `app/globals.css` (the `song-*` rules ~638-663), their tests.

- [ ] career-chart: normal fill `var(--gold)` → `var(--steel)`; peak `var(--ember)` → `var(--hand)`; partial-year `color-mix` keeps its recipe on steel. Figcaption prose: if it names a color, re-word to the role ("the lit bar is the peak year"). Test pins move (`var(--ember)`-on-peak → `var(--hand)`).
- [ ] tour-timeline: base fills gold→steel; busiest `var(--ember)` → `var(--hand)`; future stays `var(--faint)` dashed; `rounded-[2px]` stays. Test pins move.
- [ ] venue-map: choropleth ramp gold→steel; hottest state ember→hand; legend swatches follow; eyebrow at ~77 → lowercase kicker text. (No test file exists — add ONE smoke test: hottest state carries `var(--hand)`, unplayed states still drawn, legend text present.)
- [ ] song/charts.tsx + globals.css `song-*` rules: `song-ppy-bar` gradient `var(--gold)→var(--gold-deep)` → solid or two-stop steel (`var(--steel)`, mix for the deep stop); `GapSparkline` normal `var(--gold-deep,#c8902f)` → `var(--steel)` (drop the stale hex fallback), bust bars `var(--ember,#ff8a3d)` → `var(--ember)` (overdue/heat — CORRECT role already; drop the stale fallback); `MiniSparkline` → steel; `FactRibbon` value `var(--gold)` → `var(--ink)` (facts are content, not structure). Test pins move (single-ember-bust-bar rule keeps ember).
- [ ] Gates; commit `feat(redesign): shared charts — steel field, hand readings`.

### Task 3: Oracle instruments re-token

**Files:** the five `app/stats/oracle/components/*.tsx`, their tests (dow-dial, the-shelf have tests; transitions/venue-depth/coachs-notes don't — add one smoke test EACH: key role-token presence + evidence text present).

- [ ] dow-dial: hottest spoke ember→hand; above-mean gold→steel; below-mean faint stays. Narrative caveat text untouched.
- [ ] the-shelf: pack stays graphite `var(--line)` (rule: colour = time-since-play only); ring non-red gold→**steel**; red (>365d) ember stays ember. Figcaption words re-checked against colors.
- [ ] transitions-list: splice stroke gold→steel.
- [ ] venue-depth: needle normal gold→steel; red-zone needle/arc/ticks ember stays.
- [ ] coachs-notes: it is a liner-note OBJECT (like the tape), not UI chrome — its borders/spine stay; `text-gold` "Listen ↗" → `chromeLink`; any gold accents → steel.
- [ ] Gates; commit `feat(redesign): oracle instruments — steel scales, hand answers, ember heat`.

### Task 4: The tape, live, and the amber text rule

**Files:** `app/_components/setlist/tape.tsx` + test, `app/_components/live-refresh.tsx` + test, `app/globals.css` (`.live-pill`/`.live-dot` rules), `app/_components/forms.tsx` (TonightEntry) + test, `docs/superpowers/specs/…design.md` (one rule addition), `app/not-found.tsx` (comment nit).

- [ ] tape.tsx: `bg-gold` segments → `bg-steel`; `bg-ember` jams STAY (heat); hatch unchanged; fix the stale comment claiming `.set-tape-strip` is reskinned by almanac themes (no such CSS remains — say what's true: it's a stable hook, currently bare). Test pins move (`bg-gold` → `bg-steel`).
- [ ] live-refresh + CSS: de-pill. `.live-pill` box (rounded border color-mix ember) → plain inline flex: `.live-dot` background → `var(--hand)` (the mark), "LIVE" text → lowercase "live" in `.live-pill`-renamed-or-restyled rule with `color: var(--ember)` (AA text), no border/background/radius. Keep the pulse + reduced-motion. Update live-refresh test pins; grep for other `.live-pill` consumers first and update them together (show page).
- [ ] forms.tsx TonightEntry: `text-hand` on the "tonight" text and meta → `text-ember` (AA); the DOT keeps `bg-hand`. Update forms.test + page.test pins (`text-hand` assertions become `text-ember` + `bg-hand`). Fold SectionRule's inline spruce link classes onto `chromeLink` while in the file (the last drifted copy; page-chrome import is cycle-free).
- [ ] Spec edit (verbatim addition under Color and type): `- Hand is a mark-only token (3:1); amber TEXT is always ember (4.5:1). "text-hand" styling running text is a bug.`
- [ ] not-found.tsx ~11: drop the "not the immersive hero" clause.
- [ ] Gates; commit `fix(redesign): amber text is ember — live and tonight de-pilled onto the rule`.

### Task 5: Blog + carried assignments

**Files:** `app/blog/page.tsx`, `app/blog/[slug]/page.tsx`, their tests, `app/_components/post-body.tsx`/`app/globals.css` `post-prose` rules (token literals + comment), `lib/queries/shows.ts` + `shows.test.ts` (getLedgerEntryCount deletion), `app/shows/[date]/page.tsx` + `app/search/page.tsx` (short-date casing), `app/shows/page.tsx` + `app/songs/page.tsx` (kicker unification), `app/tours/page.tsx` (companion label).

- [ ] Blog index: `surface-card` list → `SectionRule` + `Ledger seed="blog"` of post rows (date mono steel · title ink hover-underline · summary muted); eyebrow → lowercase kicker via PageHead; `hover:text-gold` → underline-only. Tests: content/link scenarios untouched (they pin no classes).
- [ ] Blog post page: delete the dead `almanac-masthead` wrapper class; eyebrow → kicker; the three `hover:text-gold` links → `chromeLink`; `post-prose` CSS: replace alias tokens with the real roles (`var(--gold)` markers/quote-rule → `var(--steel)`; comment re-worded: "steel marks structure, spruce stays on links, ember appears nowhere because prose has no heat").
- [ ] `getLedgerEntryCount`: DELETE the query + its test block (its consumer died with the nameplate; the folio uses `getShowEntryNumber`). `grep -rn getLedgerEntryCount` → zero after.
- [ ] Short-date casing rule (decided): mono chrome slots print lowercase months. Add `chromeDate(date)` helper next to `chromeLink` in page-chrome.tsx (wraps `formatShortDate` and lowercases the month token; one unit test), use it in the show-page folio labels and search's show-row date slot. DATA elsewhere (long dates, metadata) untouched.
- [ ] Kicker voice: drop the `goose index · ` prefix from /shows and /songs kickers (8-of-10 majority voice); update pins. Companion label: tours index's "the year page" → "year {y} page" to match /shows; update pins.
- [ ] Gates; commit `feat(redesign): blog on the ledger + the carried assignments land`.

### Task 6: Checkpoint + whole-plan review

- [ ] Full gate `npm run typecheck && npm test && npm run build`; grep sweeps: `text-gold|bg-gold|text-sage` in non-test app/ tsx → expect ONLY `settings-menu.tsx` (plan-5-owned) and `setlist/functional.tsx` + `show-header.tsx` functional branches (2.0 skin, plan 5); `.eyebrow` consumers → zero (delete the CSS rule if so); `surface-card` consumers → zero (delete rule + fancy/functional overrides ONLY if functional's 2.0 skin doesn't need the hook — if it does, leave rule, note for plan 5).
- [ ] Visual smoke fog/slate: /blog + 404; DB pages remain fixture-verified.
- [ ] Ledger; commit `chore(redesign): plan 4 checkpoint`. Whole-plan review follows (controller dispatch).

---

## Self-review (author's, applied)

- Spec coverage: the stats charts re-skin, timelines, gauges, tape, live treatment, blog — all landed; the five carried plan-3 assignments each have an owning step; the mark/text amber split is stated as a constraint AND written into the spec by Task 4.
- The one intentional scope hold: functional (2.0) branches of setlist/show-header keep their gold classes for plan 5's re-cut; Task 6's grep sweep documents exactly that expectation.
- No placeholders: novel decisions are stated inline (role per site, exact replacements); transformation steps name their test-pin moves; new smoke tests are enumerated (venue-map, transitions, venue-depth, coachs-notes).

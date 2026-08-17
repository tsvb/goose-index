# Pen & Instrument — Plan 5 of 5: Re-cut & Retirement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-cut the 2.0 (functional) skin against the new skeleton, purge every legacy alias and dead artifact, settle the last de-carding stragglers, land the docs, and run the closing audit — leaving the branch merge-ready.

**Architecture:** The 2.0 re-cut comes FIRST (its surfaces are the last legacy-token consumers with a reason to exist); then the alias purge can be mechanical and gated by a widened sweep. The plan-4 review's worklist is this plan's source of truth — nothing on it may be silently dropped; anything deliberately kept (e.g. a radius that IS the period skin) gets a written reason in the ledger.

**Spec:** `docs/superpowers/specs/2026-08-16-pen-and-instrument-design.md` · **Worklist:** the whole-plan-4 review (in `sdd/` transcripts; key items restated per task below) · **Ledger:** `sdd/progress.md`.

## Global Constraints

- Plans 1–4 Global Constraints all bind. 2.0's PERIOD IDENTITY is the exception space: gradients, gloss, pills, and radii are period-true INSIDE `[data-experience="functional"]` scopes — the de-carding rules govern 3.0 only. 1.0 (minimal) stays untouched.
- The widened sweep is the purge gate: `grep -rEn '\bgold\b|\bsage\b|\bember\b' app --include='*.tsx'` plus `var(--gold|var(--sage|--color-gold|--color-sage` in CSS — after the purge tasks, gold/sage hits must be ZERO in tsx and CSS (ember stays — it's a real role).
- Suite baseline: 101 files / 715 tests green at `0179baf`. Every task gates green + committed; full `npm run build` at the audit.
- Copy rules everywhere, including README/docs (a number without its date is a lie).

---

### Task 1: The 2.0 re-cut

**Files:** `app/globals.css` (every `[data-experience="functional"]` block), `app/_components/setlist/functional.tssx→tsx`, `app/_components/show-header.tsx` (functional branch), `app/shows/[date]/page.tsx` (functional neighbor nav, if distinct), functional filter forms in `app/songs/page.tsx`/`app/venues/page.tsx` (the `.gel` forms — keep, they're period controls), `app/stats/page.tsx` functional skin, their tests.

- [ ] Inventory first: `grep -n 'data-experience="functional"' app/globals.css` + read each block; the skin re-cuts against the NEW markup (ledgers, FilterLinks, folios, PageHead) — style the new classes, delete rules targeting extinct ones (`.w2-*` rules whose hooks vanished, panel rules for deleted cards).
- [ ] Keep the period vocabulary: glossy appbar, striped rows (`li:nth-child(even)` style striping on Ledger rows), classic blue links, `.gel` buttons, `w2-panel` where a panel still has a consumer (show-header functional). The functional stats hub gets striping over the shared ledger markup.
- [ ] Functional branch tokens: the `text-gold` venue link, `focus:border-gold` inputs, `w2-badge gold` → period-true literals (the 2.0 skin never spoke the token roles; give it its own hardcoded period palette values, as its blues already are — that removes it from the alias dependency entirely).
- [ ] Tests: functional-variant scenarios keep passing (striping/skin assertions updated); minimal untouched.
- [ ] Gate; commit `feat(redesign): the 2.0 skin re-cut — period gloss on the new skeleton`.

### Task 2: Alias & token purge

**Files:** `app/globals.css`, the enumerated consumers, their tests.

- [ ] Migrate the last 3.0 alias consumers to real roles: `.link` → `var(--spruce)` literals; `table.song-table .gold`/`.gapcell`, `.song-group-title`, `.song-group-buy:hover`, `.song-jam` → their roles (steel/ember per meaning — jam=ember heat, titles=ink/steel per content-vs-structure); `.show-anchor-flash` keyframe → steel; scrollbar-thumb hover → steel-mix; `.nugs-show.bandcamp` sage → spruce; `.overdue` → ember; settings gear (`settings-menu.tsx` ~94) → keep the gear icon, classes to `border-line text-muted hover:border-steel hover:text-steel` (an icon control, circle stays — it's a control affordance, not a card; note the FooterFancy "gear" copy stays true).
- [ ] Delete: the `:root` legacy aliases (`--gold*`, `--sage*`, `--bg`, `--bg-deep`, `--surface`, `--surface-2`, `--shadow`), the `@theme inline` legacy maps, the inverse experience aliases (plan-1 fix) once functional is period-literal, and the de-carding bridge block — each deletion gated on its own zero-consumer grep (`bg-surface|text-gold|…` in tsx; Tailwind utilities die with the maps).
- [ ] The widened sweep (Global Constraints) → zero. Contrast gate + full suite green.
- [ ] Commit `feat(redesign): the aliases die — every color speaks its role`.

### Task 3: Dead code, stragglers, and conventions

**Files:** `app/globals.css`, `app/_components/marks.tsx`, `instrument.tsx`, `venue-map.tsx`, oracle components, `song/charts.tsx` + song CSS, tests.

- [ ] Dead CSS out: `.song-spark`/`.song-mspark` (+functional reskins), `.fade-in`, `.almanac-masthead` mentions, any rule whose class greps to zero markup.
- [ ] `.live-pill` → rename to `.live-flag` (or fold into the component) — it is no longer a pill; update live-refresh + tests.
- [ ] marks.tsx: delete the 10 unused icons (Feather, Sun, Moon, ArrowRight, Calendar, Menu, X, Disc, Cassette, Tag) after an import grep; keep Search, MapPin, Settings, Flame, ArrowLeft.
- [ ] `instrument.tsx` ~49: the reading group's `className="text-hand"` → explicit `stroke="var(--hand)"`/`fill="var(--hand)"` on the line+circle so the "text-hand is a bug" rule stays grep-enforceable; update its test pin.
- [ ] De-carding stragglers, settled: venue-map country chips lose `rounded border` (text rows); song charts obey the spec literally — `.song-ppy-bar`/`.song-bar` gradients → solid `var(--steel)`, radii → 0; `.song-scroll`/`.song-ribbon` radii → 0 (hairline borders stay).
- [ ] Hover convention consolidation: the oracle/content `hover:text-steel` family → per role: content links inside prose/lists = `chromeLink`; whole-row = underline-only; the wordmark's steel hover may stay as the one masthead signature (write the decision in the ledger).
- [ ] Coverage locks: pin `var(--steel)` on career/timeline fields; pin dial hottest=hand. Timeline label contrast: bump label size/weight or darken tints until ≥4.5:1 computed (extend the contrast gate if practical — else document the measured ratios in the ledger).
- [ ] Gate; commit `feat(redesign): dead code out, stragglers settled, conventions locked`.

### Task 4: Docs

**Files:** `README.md`, `CLAUDE.md` (pointer check only), `docs/` if referenced.

- [ ] README "The charts are the point": add the role definitions (steel=field/structure, hand=the reading/now marks-only, ember=heat/overdue+amber text, spruce=links, pencil=the human margin/caveat channel) alongside the three existing rules; verify CLAUDE.md's "How the charts work" pointer names the real section (fix whichever side is wrong).
- [ ] README editions/themes section: rewrite truthfully — three editions; 3.0 is pen & instrument with fog/slate/auto appearance (no theme wardrobe); note the date on any counts.
- [ ] Sweep README/docs for claims the redesign inverted (screenshots/section names/feature lists); fix with dates.
- [ ] Gate (docs don't break tests, but run anyway); commit `docs(redesign): README tells the truth about the new design`.

### Task 5: Closing audit + branch wrap

- [ ] Full gate: `npm run typecheck && npm test && npm run build`; the widened sweep zero; contrast gate green; `grep -rn "TODO\|FIXME" app --include='*.tsx'` reviewed (pre-existing ones noted, new ones resolved).
- [ ] Visual pass, both temperatures, desktop + mobile, on every DB-free route (404, /blog, /blog/[slug]); DB-backed pages documented as fixture-verified + owed to the user's eyeball (the plan-1 amber watch-item rides here).
- [ ] Ledger: PLAN 5 COMPLETE entry; the deliberate-keeps list (2.0 period styles, gear circle, wordmark hover) with reasons.
- [ ] Commit `chore(redesign): plan 5 closeout`. Then the controller dispatches the FINAL whole-branch review (2612d68..HEAD — the entire redesign) before finishing-a-development-branch.

---

## Self-review (author's, applied)

- Every item on the verified plan-4 worklist has an owning step; nothing dropped silently. The three deliberate keeps (period 2.0 styles, gear icon-circle, wordmark hover) are written as decisions with reasons rather than misses.
- Order matters and is honored: 2.0 goes period-literal BEFORE the alias purge, so the purge gate can be absolute.
- The audit's visual scope states its sandbox limits honestly and hands the amber eyeball to the user rather than claiming it.

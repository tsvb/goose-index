> Session ledger for the pen & instrument redesign (plans 1-5, merged to main as #11
> on 2026-08-17). Verbatim from the worktree's git-excluded sdd/progress.md apart from
> this note; the sdd/plan*-report.md files it cites were session artifacts, preserved
> uncommitted in pen-and-instrument-sdd/ beside this repository.

# Pen & Instrument redesign — progress ledger

## >>> BRANCH SHIPPED (2026-08-17) <<<
PR #11 open: https://github.com/tsvb/goose-index/pull/11 (redesign/pen-and-instrument at d32c8cb → main). Worktree kept for PR iteration.
All five plans complete and review-verified; final whole-branch review "Ready to merge — with fixes" → fixes landed, verified. Gates at d32c8cb: 102 files / 738 tests, typecheck, build, three contrast gates, gold/sage zero live, bridge deleted.
DB-BACKED EYEBALL PASS: DONE 2026-08-17, live with the user (worktree dev server on :3001 via the "redesign" launch entry + Homebrew postgresql@16 — NOTE: .env points at localhost, NOT Neon, contra the CLAUDE.md warning's day). Verified on real data: fog amber in situ (ruler reading line+circle #a67f05; dial hottest spoke; "Monday" hot text = ember #8a6504; zero text-carrying-hand elements), stats/oracle/tours/show pages both temperatures, authored-case kicker, NilState empty state on an unlogged show, 2.0 period skin + phone sheet (input = ink #2a3a47 computed; Tab focus ring = steel #1f6cb0 2px). PASS FOUND ONE BUG, fixed+pushed: tour-timeline key={d} collided on real doubleheaders (2022-07-22 Newport, 2020-02-29) — fix 6d1460a with a tree-walk key pin (SSR provably can't see the collision; first test draft was vacuous, caught by red-check). Also shipped mid-pass at the user's request: hero copy → "Goose Index(ed)" (fc1c10c). Both on PR #11.
Open decisions in the PR body + "RESERVED FOR THE USER" below: nugs chips spec-vs-site, --surface family promote-vs-delete, minors 7-10/12.
STANDING PROCESS (worked, keep for future plans): subagent-driven-development; one implementer at a time; task-brief/review-package scripts; reviewers get named-risk checks; sweeps cover BOTH var(--tok) and Tailwind utility forms; fix waves = ONE fixer with the complete findings list; controller may close reviewer-prescribed one-liner fixes by reading 100% of the diff; RUN THE BUILD in every gate (vitest/tsc cannot see CSS breakage — a comment typo broke the build for three tasks).

# Plan 1 (foundation & chrome) progress ledger

Plan: docs/superpowers/plans/2026-08-16-pen-and-instrument-1-foundation.md
Ledger note: canonical location (the .git/worktrees sdd path is write-blocked in this sandbox; briefs/review packages still live there, reports and this ledger live here).

Task 1: complete (commits 14cb141..0acb32c, review clean after fix)
  minors deferred to final review: stale Bricolage comment (globals.css ~151); stale file-header comment (globals.css 3-5); inert .entry-stamp/.entry-folio/.almanac-nameplate display:none hook
Task 2: complete (commits dbaf165 + fix e3b66af, review clean after fix; 774bdb2 = controller docs commit in between)
  test count now 598 (one added ruled-sheet panel test)
Task 3: complete (commit cba0af7, review clean, no fixes needed)
  minor deferred: html tag spans five lines for three attrs (cosmetic)
Task 4: complete (commit 7fb1849, review clean, no fixes needed; suite now 91 files / 607 tests)
  minors deferred (all plan-mandated design notes): seed-pair collision not mathematically excluded in difference tests; faint-strength test only asserts "opacity" substring; text-pencil default can lose cascade to a passed text-* class
Task 5: complete (commits a3cda97 + fixes c07a0db, 2ed49d1; review approved after two fix rounds; suite 92 files / 614 tests)
  minors deferred: TickRuler aria-hidden hides major-tick labels from AT (consumers must carry axis context in nearby text — note for plans 2/4); console.error-spy half of NaN test is dedup-order-sensitive within the file
Task 6: complete (commit 3d59646, review clean; c4ece8b = controller docs commit before it; two test-assertion deviations adjudicated sound)
  minor deferred: wordmark regex slice in site-header.test.tsx throws (not fails) if the anchor ever nests an element
Task 7: complete (checkpoint gate: typecheck + 614 tests + build green; visual smoke on DB-free routes both temperatures — DB paths blocked by sandbox; pin round-trip + pre-paint script verified in browser)
Final whole-branch review: complete. Fix wave 44d5414/fedccbb/04a569a (+0741dca plan-doc hexes) resolved Critical 1 (AA token retune + standing contrast gate app/globals-contrast.test.ts), Important 2 (inverse experience aliases), Important 3 (header-h calc), fix-now minors (blurb "Charts, pen & instrument", comment hygiene). Verifier confirmed all; suite 93 files / 632 tests.
PLAN 1 COMPLETE at 0741dca.
Watch-items for Plan 5 screenshot pass (or next dev-server eyeball): fog hand #a67f05 ochre in situ; .live-dot temporarily ember-dark on fog (Plans 2-3 should point live treatment at --hand).
Carried by design: legacy aliases + de-carding bridge (die in Plan 5); .fade-in + unused marks icons (Plan 5 purge); rounded-[2px] in tour-timeline/tape (Plans 3-4 rebuild); themeScript stale-key cleanup (optional); pen-kit test-design notes; TickRuler AT-context note for Plans 2/4.

## Plan 2 (core forms & home) — plan doc committed d91b9e7; briefs overwrite plan-1 brief filenames; reports use plan2- prefix
P2 Task 1: complete (commit bb8e892, review approved; suite 94 files / 645 tests)
  adjudicated: weekday .toLowerCase() was a forced single-answer fix of a plan code/test contradiction — upheld
  minor deferred (plan-mandated): Ledger index-keys via Children.toArray (fine for static lists; revisit if a ledger ever reorders)
P2 Task 2: complete (commits 9b9c4b6 + fix 3b58ad8, review approved after fix; suite 94 files / 650 tests)
  minors deferred: stale rounded-full comment in site-header.test.tsx (plan 5); footer test lacks explicit Feather-absence assertion (near no-op)
P2 Task 3: complete (commit a022d65, review approved, no fixes; suite 94 files / 650 tests)
  minor deferred: .almanac-nameplate CSS rule now orphaned (globals.css ~110) — delete with the entry-stamp/folio hook when plan 3 removes show-page stamp markup, or in plan 5 purge
Whole-plan-2 review: Ready for plan 3 (hygiene fix wave follows). ASSIGNED ITEMS:
  - PLAN 5 owns: settings-gear re-temper in settings-menu.tsx:96 (rounded-full + hover:gold survives only via the --gold alias; FooterFancy's "the gear in the header" line must change in the same commit if the icon becomes text); .link class alias exposure (var(--sage)); Menu/X orphaned icons in marks.tsx (join existing purge item); footer one-svg assertion (optional)
  - PLAN 3 owns: venue-context LedgerEntry weekday question (old ShowRow showed weekday as sub; forms shows tour — decide at venue-page migration); .almanac-nameplate selector deletion + display:none block comment fix; getLedgerEntryCount — delete or re-consume when the entry stamp migrates (currently consumed only by its own test)
  - Forms coverage gaps noted (SectionRule default linkLabel, TonightEntry order suffix, venue tour??loc fallback) — non-blocking
Hygiene fix wave: commit 679d510 (2.0 appbar search legibility, aria-label rule split, page.tsx comments, date voice jul-not-july, site-header.test comment). Fixer agent stalled at commit; controller verified every staged hunk against the review's prescriptions, ran the full contract (18/18 focused, typecheck, 650/650), and committed — no separate re-review dispatched since the controller read 100% of the diff.
PLAN 2 COMPLETE at 679d510.

## Plan 3 (the pages) — plan doc committed 0dab385
P3 Task 1: complete (commits 61f893a + test fix eedeebb; review approved; controller verified the two dictated test-line fixes directly, no re-review dispatched; suite 95 files / 667 tests)
  note: venue-context sub = FULL lowercase weekday (plan-mandated, matches old ShowRow)
P3 Task 2: complete (commit 615dc84, review approved, no fixes; suite 94 files / 670 tests; ShowList retired)
  adjudicated sound: lowercase jump labels; flex-gap spacing wrapper; sort toggle as FilterLink active=false (plan-level tension steel-state vs action noted for whole-plan review)
  minors deferred: NilState renders "No shows found. —" (em-dash convention — weigh at whole-plan review); spruce chrome-link class now near-duplicated in three places (consolidate when a fourth appears)
P3 Task 3: complete (commits 6d7f2d5 + fix 03ac2a7, review approved after fix; suite 673 tests)
  the Critical was a plan bug (my un-gated folio snippet deleted minimal's nav) — restored verbatim; folio+entry number = fancy/functional only; folio labels carry neighbor venue per mockup; PenNote gained inline prop
Kit fix: c8f6b31 — FolioNav dropped blanket lowercase (authored venue casing preserved); controller-dictated one-token change, verified by report, no re-review; suite 674 tests
P3 Task 4: complete (commit a129971, review approved, no fixes; suite 95 files / 695 tests)
  adjudicated sound: tag content unchanged w/ CSS lowercase (matches FilterLink precedent); NeverPlayed second link folded into NilState children (NoShowPage precedent)
  minor recurring: NilState trailing em-dash placement — third sighting; decide at whole-plan-3 review
P3 Task 5: complete (commit a7842cc, review approved, no fixes; suite 97 files / 697 tests; 2 new smoke tests)
  minors for whole-plan triage: search empty-state copy restructure was a fourth undocumented judgment call (benign); ledger row hover inconsistency (venues underline-only vs search +text-spruce) — pick one convention Checkpoint: typecheck + 650 tests + build green; visual smoke on /blog + mobile sheet in slate verified live; home visual pass still owed to the user's eyeball / plan-5 screenshots.
Whole-plan-3 review + fix wave: commits c310f67/83e721a/08cf95c (+a2da91d spec rules: hover underline-only, states-steel/actions-spruce, casing boundary). Verifier: all resolved; suite 96 files / 698 tests; typecheck+build clean.
PLAN 3 COMPLETE at 08cf95c, conditional items assigned to plan 4 doc: /blog ownership (furniture + prose re-temper); getLedgerEntryCount delete-or-consume; short-date casing rule for mono chrome slots; kicker/companion-label voice unification; SectionRule chromeLink fold-in when forms.tsx next touched; not-found.tsx:11 comment nit; live-refresh points at --hand (from plan-1 watch-item).
## Plan 4 (the instruments) — plan doc committed 5025183
P4 Task 1: complete (commits acab33b + fast-follow 21fed03, review approved; suite 96 files / 698 tests)
  fast-follow was a plan gap (brief under-specified _shell header) — StatsShell now opens via the PageHead pattern; existing stats tests held without changes (h1/switcher pins survived the swap)
P4 Task 2: complete (commits b7e18a7 + fix 970716e; review needs-fixes → all four reviewer-prescribed one-liners landed, verified by report+greps, no formal re-review; suite 98 files / 704 tests)
  adjudicated sound: tour-timeline markColour/nameColour split (hand marks, ember hot text)
  process lesson logged: self-review greps must sweep Tailwind `text-gold|bg-gold` utilities, not just `var(--gold` inline styles
P4 Task 3: complete (commits c0c164a + test fix f0449a3, review approved; suite 101 files / 713 tests)
  shelf pack-guard regex now covers gold|steel|ember|hand; hand stayed mark-only throughout (hot-day text = ember)
P4 Task 4: complete (commit ae21205, review approved, zero findings; +5ab35ab controller spec-coherence commit; suite 101 files / 713 tests)
  live de-pilled (dot=hand mark, words=ember); TonightEntry AA-fixed; SectionRule on chromeLink; app-wide text-hand sweep clean
P4 Task 5: complete (commits 948c68e + follow-up 639d2ec, review approved; suite 101 files / 714 tests)
  blog de-carded; getLedgerEntryCount deleted; chromeDate helper + lowercase-month sweep incl. tours ranges ("From"→"from" folded in, disclosed); search song-row "last played Jun 12" pin left capitalized — flag for whole-plan-4 review
P4 Task 6 checkpoint: gates green (101/714 + typecheck + build); sweeps ran; sage stragglers fixed 4487b77; whole-plan-4 fix wave 0179baf

P3 Task 6: complete (commit 289ec97; suite 95 files / 688 tests, gate green)
  deleted show-card.tsx/.test.tsx + section-header.tsx/.test.tsx (zero live consumers per grep; on-this-day/page.test.tsx's "ShowCard" hit is a test-title/negative-assertion string, not an import; lib/elgoose ShowRow is an unrelated raw-row type)
  globals.css: removed the orphaned [data-experience] .rise override (base .rise{} rule + keyframes already gone, no markup ever used it) — the .rise-era leftover the brief flagged. .fade-in kept (still has a base rule). .live-pill/.live-dot kept — both still rendered by live-refresh.tsx, still consumed by app/shows/[date]/page.tsx (TonightEntry doesn't own live yet, contra the brief's assumption). .almanac-masthead: blog/[slug]/page.tsx remains a live consumer and the class has no CSS rule anyway — nothing to delete, noted only.

## Plan 5 (re-cut & retirement) — plan doc committed 4a3afc8; briefs overwrite plan-1 filenames; reports use plan5- prefix
P5 Task 1: complete (commits 4a3afc8..9bffc89 + fix wave 64c1735; review "Needs fixes" → all three findings fixed → re-review approved; forms.test.tsx 16/16 focused, full suite count re-verified at Task 2 gate — baseline 715 +1 new striping test)
  minor deferred to final review: ledger-row test regex is exact-string (`class="ledger-row"`, forms.test.tsx:70) — survives today's bare literal, but a clsx refactor would need a `\bledger-row\b` pattern
  alias-dependency risk now travels in code: globals.css inverse-aliases comment (~421-432) + 64c1735's commit body both state "define period-literal role tokens under [data-experience=functional] BEFORE deleting the aliases"
P5 Task 2: complete (commits cf45cbc + fix wave cb3b326; review "Needs fixes" → the one Important + two adjacent minors fixed; reviewer-prescribed one-liners verified by controller reading 100% of the diff, no formal re-review per P4T2 precedent; suite 101 files / 717 tests, typecheck clean, contrast gate 18/18)
  fixed in wave: bandcamp hover was AA-broken in slate (2.15:1) by a mix-toward-black idiom → color-mix toward var(--ink), now fog 5.87:1 / slate 6.48:1 (computed, in commit body — the contrast gate cannot see color-mix in rule bodies); scrollbar hover same idiom fix; report no-op overclaim corrected
  adjudicated (controller): the widened sweep's "ZERO in tsx" reads as live code — the ~30 remaining \bgold\b|\bsage\b hits are negative-assertion guards (which enforce the purge) + 3 CSS comment lines narrating it; deleting guards to satisfy the letter would weaken the gate. Flagged for final review.
  minors deferred to final review: .song-group-title steel-vs-ink (album name as content?); the guard-assertion sweep reading above
  NOT deleted (gates failed, globals.css comments updated truthfully ~30-36, ~181-187): --bg/--bg-deep/--surface/--surface-2 + @theme maps (real consumers verified: venue-map, the-shelf, tape, songs/venues pages, mobile-nav, coachs-notes, several globals.css rules); de-carding bridge (fancy .rounded* consumers remain) — bridge re-gated in Task 3 after straggler work; --surface family likely survives plan 5 → final review should weigh promoting it to a real role token vs deleting (user call at merge)
  extras adjudicated required, kept: .gold→.rotation rename (live \bgold\b tsx hit; hard sweep demanded it); .song-spark/.song-mspark --gold-deep fallback → steel (averted silent amber repaint in fog+slate)
P5 Task 3: complete (commits be5db06 + fix wave 1448a0c; review "Needs fixes" → both Importants + two test minors fixed, re-review approved zero findings; suite 102 files / 724 tests at review time — the fix wave's --bg-deep assertion makes it 725, first measured by Task 4's full run; typecheck clean, contrast gates green incl. new tour-timeline label gate)
  corrections of record: the P5T1 inventory row calling .song-spark/.song-mspark live was WRONG (bundled verdict over mixed selectors) — they were dead since P4 b7e18a7; deleted with evidence. The P3T6 note claiming blog/[slug] consumes .almanac-masthead is stale — grep now finds nothing. The Task-2 carry-forward bridge-consumer list was partly wrong: songs/venues pages' rounded-lg sit in functional-only branches (never bridge consumers).
  bridge re-gate outcome: KEPT — genuine fancy-scoped consumers remain (setlist/fancy.tsx:16, skeleton.tsx:13); comment updated truthfully. Final review decides its fate with the --surface family.
  fixed in wave: functional song-chart radii restored under scope byte-identical to be5db06 deletions (12px ribbon / 3px 3px 0 0 ppy / 5px bar / 10px scroll+inner — base stays square, period identity preserved); tour-timeline-label-contrast test now extracts mix percentages from component source (fail-loud), asserts --bg-deep→paper; tour-timeline steel assertion tightened to wash+ticks emissions
  convention decisions locked: oracle hover triage → underline-only (coachs-notes, venue-depth, the-shelf) / chromeLink (transitions-list); wordmark steel hover KEPT as the one masthead signature (brief-authorized); settings gear hover:text-steel kept (control, pinned)
  timeline label contrast: fog steel 3.65→5.09, slate steel 3.85→5.03, fog ember 3.52→4.96, slate ember 4.24→4.75 (30%-toward-ink mix; reviewer reproduced independently)
  minors deferred to final review: new contrast gate covers fog+slate only — functional redefines the same tokens and renders TourTimeline (pre-existing gate scope); de-carding leftovers .song-bust 999px + .song-group-buy 2px radii, rounded-[2px] arbitrary-value classes in tour-timeline/tape (bridge selector cannot match arbitrary values)
P5 Task 4: complete (commits 8f8b481 + fix cc431ff; review "Needs fixes" → one-line spruce-claim fix, reviewer-prescribed wording, controller verified 100% of the diff, no re-review; suite 102 files / 725 tests, typecheck clean)
  README now carries: the five-role table (hand marks-only nuance included), truthful three-editions section (fog/slate/auto is 3.0-only, no wardrobe), dated screenshot captions (images committed 11e30b7, 2026-07-13), CLAUDE.md chart pointer fixed to the real heading "The charts are the point"
  adjudicated by review, held up: screenshots-with-dated-caption is honest (regeneration optional — note for user at wrap); "classic blue links" correctly scoped to 2.0's setlist/venue links
  deferred to final review: spruce's two non-link footnote marks in setlist/fancy.tsx (130, 163) — README claim now matches code, but weigh whether the color-means-one-thing rule wants an enforcement test (spruce = links + their footnote apparatus) or a code change
  note: 724→725 mystery resolved — T3's fix wave added the --bg-deep assertion; T4's full run measured it first
P5 Task 5: complete (commit 6579711 — chore(redesign): plan 5 closeout; suite 102 files / 725
  tests, typecheck clean, build green)
  Gate finding: npm run build was broken at cc431ff — a Plan 5 Task 2 CSS comment
  (globals.css:35, "--gold*/--sage*/--shadow reached...") contained a literal `*/` that closed
  the surrounding /* Legacy aliases */ comment early, leaving invalid CSS behind it. tsc/vitest
  never parse CSS so this went undetected through Tasks 3 and 4 (neither report ran the build
  step). Reworded the comment (no functional CSS touched); build now compiles clean.
  Sweeps: gold/sage confirmed ZERO in live code — the only remaining hits are three CSS
  comment lines narrating the purge (globals.css:35/396/532, now `*/`-safe) plus ~34
  negative-assertion test guards across 20 test files that enforce the purge (kept
  deliberately, per controller baseline).
  TODO/FIXME: zero hits in app/**/*.tsx and lib/ — nothing to disposition.
  Visual pass: 24 screenshots (404, /blog, /blog/[slug] × fog/slate × desktop/mobile for 3.0,
  × desktop/mobile single-look for 2.0/1.0), driven live through the settings-gear UI on a
  worktree-local `next dev -p 3100` (no .env, confirmed DB-free). Zero amber (#a67f05)
  sightings — checked visually and via a per-pixel scan — expected, since --hand marks live
  only in stats/oracle components not reachable on these DB-free routes; the amber eyeball and
  the full DB-backed visual pass (home/shows/stats) remain owed to the user.
  Finding (not fixed, flagged separately as task_87ea2258): the settings popover
  (settings-menu.tsx) doesn't auto-close on a 3.0→2.0 switch on ordinary pages, contra its own
  code comment — closes fine on /404 and on any →1.0 switch. Pre-existing (component dates to
  290afbb, well before this branch); unrelated to the redesign's token/color work.
PLAN 5 COMPLETE at 6579711.

Deliberate keeps (final review should weigh, not silently drop):
  - 2.0 period styles, including the functional-only song-chart radii scoped back in P5 Task 3
    (be5db06 deletions were byte-scoped; 1448a0c restored the period-literal radii under
    [data-experience="functional"] only) — 2.0's Web 2.0 visual identity is intentional, not
    residue.
  - The settings-gear icon-in-a-circle (settings-menu.tsx): kept as a control affordance, not
    a card — hover:text-steel/hover:border-steel is standard interactive-control styling, not
    the retired gold-card treatment the purge removed elsewhere. Guarded by
    settings-menu.test.tsx's explicit "not the retired gold alias" assertion.
  - The wordmark steel hover (site-header.tsx / masthead): the one deliberate hover-color
    exception across the site, kept as the masthead's signature per Plan 5 Task 3's convention
    decision (oracle hover triage: everywhere else is underline-only or chromeLink).
  - The de-carding bridge (globals.css .rounded* selectors under the functional/legacy
    scope): kept because it still has live fancy-mode consumers — setlist/fancy.tsx:16 and
    skeleton.tsx:13 both render through it. Re-gated at every Plan 5 task since Task 2; still
    genuinely consumed as of this task's sweep.
  - The --bg/--bg-deep/--surface/--surface-2 token family (globals.css ~30-36): kept because
    it has real, verified consumers (venue-map.tsx, the-shelf.tsx, venue-depth.tsx, tape.tsx,
    and several rules in globals.css itself) — not dead aliases like the gold/sage family that
    got deleted alongside it in P5 Task 2. Its fate (promote to a real role token vs. delete)
    is explicitly a final-review / user call, not resolved here.
  - gold/sage negative-assertion guards in ~20 test files: kept because they enforce the purge
    — deleting them to make a literal-string sweep read "zero hits including tests" would
    weaken the gate the purge depends on, not strengthen it.

FINAL WHOLE-BRANCH REVIEW (2612d68..6579711, most-capable tier): "Ready to merge — with fixes." Fix wave dispatched for:
  Critical 1: 2.0 mobile sheet search input white-on-white (~1.16:1) — the .w2-appbar input white rule (679d510) leaks into the sheet; re-scope to an appbar-search hook class + pin
  Important 2: fancy show-page kicker CSS-lowercases authored tour names (show-header.tsx:147, spec casing-boundary violation; plan-3 plan bug) + songs/[slug] cover-tag folds artist names — fold chrome words only, pin
  Important 3: TourTimeline labels fail AA in functional (steel 4.10:1 / ember 3.69:1) — functional-scoped label color (ink ≈6.95:1) + extend the label gate to the functional block
  Important 4 + open(d): fancy setlist empty state is a dashed box (spec: "No dashed boxes") → NilState; SkeletonBar drops rounded (visual no-op); then bridge zero-consumer re-gate → delete if zero
  Important 5: README ember cell false ("the one role allowed as text") → "the one amber allowed as text (--hand never is)"
  plus Minor 11 (cheap, protective): source-order pin — dark-OS media block must precede experience blocks (specificity tie is load-bearing)
RESERVED FOR THE USER (not in the fix wave):
  Important 6: nugs Listen/Watch chips were never de-carded — spec says text links, site ships bordered gradient chips on every show page (fell through a plan seam, never adjudicated). Decide: convert, or amend the spec with a recorded reason.
  Open (a): --bg/--bg-deep/--surface/--surface-2 — reviewer recommends PROMOTE to documented roles (functional/minimal hold distinct period values; deletion would break 2.0 panels). Caution if restructuring: tour-timeline-label-contrast.test.ts textually asserts --bg-deep: var(--paper).
  Minors 7-10 (taste/AT polish): blog-prose radii in 3.0; empty-state casing voice (spec's lowercase "no shows match. —" vs shipped sentence case); FolioNav nav needs aria-label; steel doubling as heading accent on home/search.
  Minor 12: cosmetic de-carding leftovers (.song-bust 999px, .song-group-buy 2px, rounded-[2px] arbitrary values).
Triage of all prior deferred minors: everything else FINE AS-IS or already resolved in passing — incl. endorsements of the guard-assertion sweep reading, spruce footnote marks (revisit only on a third non-link use), song-group-title steel, search "Jun 12" capitalization (non-mono slot). Deliberate keeps: all endorsed except the bridge (retired via fix wave if the re-gate zeroes).
Final-review fix wave: commits feec5c9/e60193b/4c3aba5/b91b1a9/681116e/83fad15 — all six findings resolved; DE-CARDING BRIDGE DELETED (re-gate zero: remaining .rounded* hits all functional/minimal-scoped; skip-link focus:rounded-md exempt by design). Verifier (capable tier): "All resolved", all ratios independently reproduced.
Post-verify micro-wave: d32c8cb — the 2.0 white focus ring scoped off the mobile sheet (was ~1.15:1 on sheet paper, the Critical's exact shape, branch-introduced; sheet controls now steel ~4.7:1) + the tour-label custom-property mechanism pinned (a bare inline color revert would silently restore the 2.0 AA failure — now caught). Suite 102 files / 738 tests, typecheck + build green.
Verifier sign-offs recorded (accepted, not fixed): SkeletonBar corners now square in 2.0/1.0 too (was 4px; loading shimmer, experience-neutral component — noted against the "2.0 keeps its geometry" principle); functional future-tour timeline labels read ink not faint (faint was 4.26:1, below AA — contrast improved; dashed border + transparent bar still carry "future").
BRANCH READY at d32c8cb: 102 files / 738 tests, typecheck clean, build clean, contrast gates (3 files) green, gold/sage zero in live code, bridge gone. Review verdict: "Ready to merge — with fixes" → fixes landed and verified.
Branch prefix note for the merge decision: the branch carries 68d519c..2612d68 below the redesign (Registrar theme #10, blog tables #9, bandcamp scraper — separately PR'd pre-redesign work); merging brings it along.

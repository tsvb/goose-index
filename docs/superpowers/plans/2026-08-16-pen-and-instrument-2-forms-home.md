# Pen & Instrument — Plan 2 of 5: Core Forms & Home

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reference-work forms (section rule, ledger, contents, figures) on the plan-1 kits, re-temper the remaining chrome (search, footer, mobile nav, skeletons), and rebuild the home page as the first fully pen-&-instrument surface.

**Architecture:** New form components live beside the old ones — `SectionHeader`, `ShowCard`, `ShowRow` stay untouched because un-migrated pages (plan 3) still import them; home simply stops using them. The home fancy branch is rewritten on the new forms; the minimal (1.0) branch is untouched; the functional (2.0) edition shares the fancy markup and reads plainer until plan 5 re-cuts its skin — accepted interim state.

**Tech Stack:** Same as plan 1. Consumes plan 1's `PenRule`/`PenNote` (`app/_components/pen.tsx`) and `TickRuler` (`app/_components/instrument.tsx`).

**Spec:** `docs/superpowers/specs/2026-08-16-pen-and-instrument-design.md`. Plan 1's ledger of carried items: `sdd/progress.md`.

## Global Constraints

- Everything in plan 1's Global Constraints still binds (AA-retuned tokens are now gated by `app/globals-contrast.test.ts`; motion budget = live dot only; lowercase chrome, authored content keeps casing; deterministic pen; tests via `renderToStaticMarkup` string assertions).
- One meaning per color: ink=content, steel=structure (dates, section leads), hand=now/the reading (the live dot moves to `bg-hand` here, per the final review's watch-item), spruce=links only, pencil=human margin.
- Copy rules (CLAUDE.md, all six): every figure, count, year, and label on home is computed at render time; no claim the data can contradict.
- The whole-entry hover affordance is a hairline underline on the title — nothing moves, nothing glows.
- Un-migrated components (`ShowCard`, `ShowRow`, `SectionHeader`, `show-list.tsx`) are NOT deleted or edited in this plan; they retire in plan 3 with their consumers.
- Suite baseline at plan start: 93 files / 632 tests green at commit `0741dca`. Every task ends green and committed.
- Worktree `.claude/worktrees/pen-and-instrument`, branch `redesign/pen-and-instrument`; dev servers on port 3100 only. DB-backed pages cannot be loaded in this sandbox (env access is blocked) — page behavior is verified by the fixture-driven tests; visual smoke uses DB-free routes (404, /blog).

---

### Task 1: The forms — SectionRule, Ledger, ContentsRow, Figure

**Files:**
- Create: `app/_components/forms.tsx`
- Create: `app/_components/forms.test.tsx`

**Interfaces:**
- Consumes: `PenRule` from `app/_components/pen.tsx` (`{ seed, strength?, className? }`); `showHref`, `dateParts`, `locationLine` from `@/lib/queries/format`; `ShowSummary` from `@/lib/queries/shows`; `clsx` from `./clsx`.
- Produces (Tasks 2–3 and plan 3 consume these exact signatures):
  - `SectionRule({ title, href, linkLabel = "see all", seed }: { title: React.ReactNode; href?: string; linkLabel?: string; seed: string })` — lowercase section heading over a strong pen rule, optional spruce link on the right.
  - `Ledger({ children, seed }: { children: React.ReactNode; seed: string })` — list wrapper that interleaves faint pen rules between entries (no rule above the first or below the last; the strong rule comes from `SectionRule`).
  - `LedgerEntry({ show, context }: { show: ShowSummary; context?: "venue" | "tour" })` — one show as a whole-row link: date+weekday (steel/faint) · venue+location (ink/muted) · count+notes (faint mono, sage→spruce via `.text-spruce`). Context variants mirror the old `ShowRow` semantics (on "venue" pages the date takes the display slot and tour replaces venue; on "tour" pages the tour eyebrow drops).
  - `TonightEntry({ show }: { show: ShowSummary })` — the live variant: hand-colored `tonight` slot with a pulsing dot, "the setlist will appear live" meta.
  - `ContentsRow({ href, label, sub }: { href: string; label: string; sub: string })` — one contents line: lowercase label (ink, underline on hover) with the computed sub (muted) and count-bearing text; no icons, no circles, no arrows.
  - `Figure({ value, label }: { value: string; label: string })` — big tabular numeral over a lowercase label.

- [ ] **Step 1: Write the failing test**

Create `app/_components/forms.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SectionRule, Ledger, LedgerEntry, TonightEntry, ContentsRow, Figure } from "./forms";
import type { ShowSummary } from "@/lib/queries/shows";

const show: ShowSummary = {
  showId: 1,
  date: "2026-08-12",
  order: null,
  venue: "The Salt Shed",
  city: "Chicago",
  state: "IL",
  country: "USA",
  tour: "Summer Tour 2026",
  songCount: 19,
  hasNotes: true,
};

describe("SectionRule", () => {
  it("draws a lowercase heading over a strong pen rule", () => {
    const html = renderToStaticMarkup(<SectionRule title="latest shows" seed="latest" />);
    expect(html).toMatch(/<h2[^>]*>latest shows<\/h2>/);
    expect(html).toContain("text-pencil"); // the pen rule
    expect(html).not.toContain("opacity"); // strong, not faint
  });
  it("offers the optional spruce link", () => {
    const html = renderToStaticMarkup(
      <SectionRule title="latest shows" seed="latest" href="/shows" linkLabel="browse all shows" />,
    );
    expect(html).toContain('href="/shows"');
    expect(html).toContain("browse all shows");
    expect(html).toContain("text-spruce");
  });
  it("no href, no link", () => {
    const html = renderToStaticMarkup(<SectionRule title="t" seed="s" />);
    expect(html).not.toContain("<a");
  });
});

describe("Ledger", () => {
  it("rules between entries, not around them", () => {
    const html = renderToStaticMarkup(
      <Ledger seed="l">
        <span>one</span>
        <span>two</span>
        <span>three</span>
      </Ledger>,
    );
    // 3 entries → exactly 2 faint separator rules.
    expect(html.match(/opacity/g)?.length).toBe(2);
  });
  it("a single entry needs no rule at all", () => {
    const html = renderToStaticMarkup(
      <Ledger seed="l">
        <span>only</span>
      </Ledger>,
    );
    expect(html).not.toContain("opacity");
  });
});

describe("LedgerEntry", () => {
  it("is one whole-row link with date, venue, place, and count", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={show} />);
    expect(html).toContain('href="/shows/2026-08-12"');
    expect(html).toContain("aug 12");
    expect(html).toContain("wed");
    expect(html).toContain("The Salt Shed"); // authored content keeps its casing
    expect(html).toContain("Chicago, IL");
    expect(html).toContain("19 songs");
    expect(html).toContain("notes");
    expect(html).toContain("text-steel"); // the date wears structure
  });
  it("no setlist reads as a nil, not a zero", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={{ ...show, songCount: 0, hasNotes: false }} />);
    expect(html).not.toContain("0 songs");
    expect(html).toContain("—");
  });
  it("stays a flat row — no card classes", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={show} />);
    expect(html).not.toMatch(/rounded|shadow|bg-surface/);
  });
  it("venue context: the date takes the display slot", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={show} context="venue" />);
    expect(html).toContain("aug 12, 2026");
    expect(html).not.toContain("The Salt Shed");
  });
  it("tour context drops the repeated tour name", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={show} context="tour" />);
    expect(html).not.toContain("Summer Tour 2026");
  });
});

describe("TonightEntry", () => {
  it("wears the hand and promises the live setlist", () => {
    const html = renderToStaticMarkup(<TonightEntry show={{ ...show, songCount: 0, hasNotes: false }} />);
    expect(html).toContain('href="/shows/2026-08-12"');
    expect(html).toContain("tonight");
    expect(html).toContain("text-hand");
    expect(html).toContain("bg-hand"); // the dot
    expect(html).toContain("animate-pulse");
    expect(html).toContain("motion-reduce:animate-none");
    expect(html).toContain("the setlist will appear live");
  });
});

describe("ContentsRow", () => {
  it("is a text row: label, sub, no icon circles", () => {
    const html = renderToStaticMarkup(<ContentsRow href="/songs" label="songs" sub="615 songs, sorted any way" />);
    expect(html).toContain('href="/songs"');
    expect(html).toContain("songs");
    expect(html).toContain("615 songs, sorted any way");
    expect(html).not.toMatch(/rounded-full|<svg/);
  });
});

describe("Figure", () => {
  it("is a numeral over a lowercase label", () => {
    const html = renderToStaticMarkup(<Figure value="823" label="shows" />);
    expect(html).toContain("823");
    expect(html).toContain("shows");
    expect(html).toContain("tabular-nums");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/_components/forms.test.tsx`
Expected: FAIL — module `./forms` does not exist.

- [ ] **Step 3: Implement `app/_components/forms.tsx`**

```tsx
import Link from "next/link";
import { Children } from "react";
import { PenRule } from "./pen";
import { clsx } from "./clsx";
import { showHref, dateParts, locationLine } from "@/lib/queries/format";
import type { ShowSummary } from "@/lib/queries/shows";

/** Section heading over the pen's strong rule. Chrome is lowercase; pass
 * authored content (venue names, dates) already cased as it should read. */
export function SectionRule({
  title,
  href,
  linkLabel = "see all",
  seed,
}: {
  title: React.ReactNode;
  href?: string;
  linkLabel?: string;
  seed: string;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[0.8rem] font-semibold lowercase text-ink">{title}</h2>
        {href && (
          <Link
            href={href}
            className="shrink-0 text-[0.75rem] lowercase text-spruce underline underline-offset-4 transition hover:text-ink"
          >
            {linkLabel}
          </Link>
        )}
      </div>
      <PenRule seed={seed} className="mt-1" />
    </div>
  );
}

/** The ledger: entries separated by faint pen rules. The strong head rule
 * belongs to SectionRule, so a ledger composes under any heading. */
export function Ledger({ children, seed }: { children: React.ReactNode; seed: string }) {
  const items = Children.toArray(children);
  return (
    <div>
      {items.map((child, i) => (
        <div key={i}>
          {i > 0 && <PenRule seed={`${seed}-${i}`} strength="faint" />}
          {child}
        </div>
      ))}
    </div>
  );
}

/** One show, one line. The whole row is the link; hover underlines the
 * display slot. Meta reads nil ("—") over zero, per copy rule 1. */
export function LedgerEntry({ show, context }: { show: ShowSummary; context?: "venue" | "tour" }) {
  const dp = dateParts(show.date);
  const loc = locationLine(show.city, show.state, show.country);
  const onVenue = context === "venue";
  const month = dp.month.slice(0, 3).toLowerCase();
  const display = onVenue ? `${month} ${dp.day}, ${dp.year}` : (show.venue ?? "Unknown venue");
  const sub = onVenue ? (show.tour ?? loc) : loc;
  return (
    <Link
      href={showHref(show.date, show.order)}
      className={clsx(
        "group grid items-baseline gap-x-4 py-2.5",
        onVenue ? "grid-cols-[1fr_auto]" : "grid-cols-[5.6rem_1fr_auto]",
      )}
    >
      {!onVenue && (
        <span className="shrink-0">
          <span className="block font-mono text-[0.8rem] text-steel">{`${month} ${dp.day}`}</span>
          <span className="block font-mono text-[0.62rem] lowercase text-faint">
            {dp.weekday.slice(0, 3)} · {dp.year}
          </span>
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[0.95rem] text-ink underline-offset-4 group-hover:underline">
          {display}
        </span>
        <span className="block truncate text-[0.8rem] text-muted">{sub || "—"}</span>
      </span>
      <span className="text-right font-mono text-[0.7rem] text-faint">
        {context !== "tour" && !onVenue && show.tour && (
          <span className="mb-0.5 hidden max-w-[14rem] truncate lowercase sm:block">{show.tour}</span>
        )}
        <span className="block">
          {show.songCount > 0 ? `${show.songCount} songs` : "—"}
          {show.hasNotes && <span className="ml-2 text-spruce">notes</span>}
        </span>
      </span>
    </Link>
  );
}

/** Tonight's show: the hand marks now. The dot is the site's one motion. */
export function TonightEntry({ show }: { show: ShowSummary }) {
  const loc = locationLine(show.city, show.state, show.country);
  return (
    <Link
      href={showHref(show.date, show.order)}
      className="group grid grid-cols-[5.6rem_1fr_auto] items-baseline gap-x-4 py-2.5"
    >
      <span className="flex items-center gap-1.5 font-mono text-[0.8rem] lowercase text-hand">
        tonight
        <span
          aria-hidden
          className="inline-block h-[0.45em] w-[0.45em] rounded-full bg-hand animate-pulse motion-reduce:animate-none"
        />
        {show.order != null && <span className="text-faint">· {show.order}</span>}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.95rem] text-ink underline-offset-4 group-hover:underline">
          {show.venue ?? "Unknown venue"}
        </span>
        <span className="block truncate text-[0.8rem] text-muted">{loc || "—"}</span>
      </span>
      <span className="text-right font-mono text-[0.7rem] lowercase text-faint">
        the setlist will appear live
      </span>
    </Link>
  );
}

/** One line of the contents: where a reader can go, and how much is there. */
export function ContentsRow({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} className="group flex items-baseline justify-between gap-4 py-2">
      <span className="lowercase text-ink underline-offset-4 group-hover:underline">{label}</span>
      <span className="text-right text-[0.8rem] text-muted">{sub}</span>
    </Link>
  );
}

/** A figure: the number, then its name. */
export function Figure({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-[1.6rem] font-semibold leading-tight text-ink [font-variant-numeric:tabular-nums]">
        {value}
      </span>
      <span className="text-[0.68rem] lowercase text-faint">{label}</span>
    </span>
  );
}
```

Note on the tabular-nums assertion: the arbitrary property `[font-variant-numeric:tabular-nums]` puts the literal string `tabular-nums` in the class attribute, which is what the test pins.

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run app/_components/forms.test.tsx`
Expected: PASS. If `ShowSummary`'s shape differs from the test fixture (check `lib/queries/shows.ts`), adjust the FIXTURE to the real type — never the type.

- [ ] **Step 5: Full gate and commit**

Run: `npm test && npm run typecheck`
Expected: green (93 + 1 files).

```bash
git add app/_components/forms.tsx app/_components/forms.test.tsx
git commit -m "feat(redesign): the forms — section rule, ledger, contents, figure"
```

---

### Task 2: Chrome re-temper — search, footer, mobile nav, skeletons

**Files:**
- Modify: `app/_components/search-box.tsx` (class strings only)
- Modify: `app/_components/site-footer.tsx` (`FooterFancy` only)
- Modify: `app/_components/mobile-nav.tsx` (trigger + sheet styling; behavior untouched)
- Modify: `app/_components/skeleton.tsx` (`SkeletonRows`, `SkeletonPills`)
- Modify: their four `.test.tsx` files (expectations only, scenarios kept)

**Interfaces:**
- Consumes: `PenRule` from `./pen`.
- Produces: no signature changes anywhere — this task is pure re-skinning; every export keeps its name and props.

- [ ] **Step 1: Search box becomes a hairline underline**

In `app/_components/search-box.tsx`, replace the two input class strings:
- full: `"w-full rounded-full border border-line bg-surface py-3.5 pl-12 pr-4 text-ink placeholder:text-faint outline-none transition focus:border-gold"` →
  `"w-full rounded-none border-0 border-b border-line bg-transparent py-3 pl-12 pr-4 text-ink placeholder:text-faint outline-none transition focus:border-steel"`
- compact: `"w-36 rounded-full border border-line bg-surface/60 py-2 pl-8 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:w-52 focus:border-gold"` →
  `"w-36 rounded-none border-0 border-b border-line bg-transparent py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:w-52 focus:border-steel"`
- Both `Search` icon spans: `group-focus-within:text-gold` → `group-focus-within:text-steel`.
- Placeholders to lowercase chrome: `"Try a song, a date (2022-06-24), a venue, or a city…"` → `"try a song, a date (2022-06-24), a venue, or a city…"`; `"Search…"` → `"search…"`. `aria-label="Search the index"` stays (assistive copy, sentence case is kinder to screen readers).

Update `search-box.test.tsx` expectations: assert `border-b` and `focus:border-steel` present, `rounded-full`/`gold` absent.

- [ ] **Step 2: FooterFancy — a ruled colophon**

Replace the whole `FooterFancy` function with:

```tsx
export function FooterFancy() {
  return (
    <footer className="mt-24">
      <Container>
        <PenRule seed="footer" />
      </Container>
      <Container className="grid gap-10 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <span className="text-[0.95rem] font-semibold lowercase text-ink">goose index</span>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            A complete index of every Goose show — setlists, segues, jams, venues, and the story of
            each night.
          </p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2 text-sm text-muted">
          <span className="text-[0.68rem] font-semibold lowercase text-faint">browse</span>
          <Link href="/shows" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">all shows</Link>
          <Link href="/songs" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">songs</Link>
          <Link href="/stats" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">stats</Link>
          <Link href="/on-this-day" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">on this day</Link>
          <Link href="/venues" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">venues</Link>
          <Link href="/tours" className="lowercase underline-offset-4 transition hover:text-ink hover:underline">tours</Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm text-muted">
          <span className="text-[0.68rem] font-semibold lowercase text-faint">source</span>
          <p className="leading-relaxed">
            Setlist data courtesy of{" "}
            <a href="https://elgoose.net" className="link" target="_blank" rel="noreferrer">
              elgoose.net
            </a>
            . A non-commercial fan project.
          </p>
          {/* We take the band's music and their words and make a site out of them.
              The least we can do is point at the shop where buying it pays them. */}
          <p className="mt-2 leading-relaxed">
            Support the band directly on{" "}
            <a href={BANDCAMP_HOME} className="link" target="_blank" rel="noreferrer">
              Bandcamp
            </a>
            .
          </p>
        </div>
      </Container>
      <div className="border-t border-line-soft">
        <Container className="py-4 text-center font-mono text-xs lowercase text-faint">
          you&rsquo;re reading the <span className="text-steel">3.0</span> edition — the gear in the header
          switches to 2.0 (glossy) or 1.0 (plain).
        </Container>
      </div>
      <div className="border-t border-line-soft">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-faint sm:flex-row">
          <span className="font-mono">© {new Date().getFullYear()} Goose Index</span>
          <span className="font-mono">Not affiliated with Goose. Built by fans.</span>
        </Container>
      </div>
    </footer>
  );
}
```

Add `import { PenRule } from "./pen";`; drop the `Feather` import (verify no other function in the file uses it). `FooterFunctional`/`FooterMinimal` untouched. Update `site-footer.test.tsx`: fancy assertions become `goose index` (lowercase), `text-pencil` (the rule), no `Feather`/`text-gold`; keep the elgoose/Bandcamp/edition-line scenarios.

- [ ] **Step 3: MobileNav sheds its circles and shadow**

In `app/_components/mobile-nav.tsx`, styling only:
- Trigger button class → `"text-[0.85rem] lowercase text-muted underline underline-offset-4 transition hover:text-ink"`, and its content: replace the icons with text `{open ? "close" : "menu"}` (drop the `Menu`, `X` imports; keep `Search`).
- Sheet wrapper: replace `border-b border-line bg-bg shadow-[0_24px_48px_-20px_var(--shadow)]` with `border-b border-line bg-paper`.
- Sheet input: same underline treatment as Task 2 Step 1 (`rounded-none border-0 border-b border-line bg-transparent … focus:border-steel`), icon `group-focus-within:text-steel`, placeholder `"search songs, shows, venues…"`.
- Nav links: `font-display text-xl` → `text-lg lowercase`; active class `text-gold` → `text-steel`; render `{n.label.toLowerCase()}`.
- Scrim (`bg-bg-deep/50`) stays; `bindSheetDismissal` and all behavior stays.

Update `mobile-nav.test.tsx` expectations (menu/close text instead of aria-only icon button if pinned; `text-steel` active; no `shadow`).

- [ ] **Step 4: Skeletons — bars without cards or pills**

In `app/_components/skeleton.tsx`:
- `SkeletonRows`: drop the `surface-card` wrapper class → `"overflow-hidden"` alone, keep the `border-t border-line-soft` row separators.
- `SkeletonPills`: rename nothing; change the bar class `"h-7 w-16 rounded-full"` → `"h-5 w-16"` and update its doc comment to "A row of filter-text ghosts." (the pills died with the pill controls).
Update `skeleton.test.tsx` expectations if they pin `surface-card`/`rounded-full`.

- [ ] **Step 5: Gate and commit**

Run: `npm test && npm run typecheck`
Expected: green.

```bash
git add app/_components/search-box.tsx app/_components/site-footer.tsx app/_components/mobile-nav.tsx app/_components/skeleton.tsx app/_components/search-box.test.tsx app/_components/site-footer.test.tsx app/_components/mobile-nav.test.tsx app/_components/skeleton.test.tsx
git commit -m "feat(redesign): chrome re-temper — underline search, ruled footer, text mobile nav, plain skeletons"
```

---

### Task 3: Home, rebuilt

**Files:**
- Modify: `app/page.tsx` (the fancy/functional branch; the `experience === "minimal"` branch is untouched)
- Modify: `app/page.test.tsx` (scenarios kept, expectations reworked; nameplate scenarios deleted with the nameplate)

**Interfaces:**
- Consumes: everything Task 1 produced; `TickRuler` from `./_components/instrument`; existing queries (`getOverviewStats`, `getRecentShows`, `getUpcomingShows`, `getOnThisDay`, `getTonightShows`) and format helpers — query signatures unchanged.
- Produces: the home markup plans 3–5 treat as the reference implementation of the language.

- [ ] **Step 1: Rework the page test first**

In `app/page.test.tsx`, keep every scenario except the almanac-nameplate describe block (delete it — the nameplate and `romanNumeral` die with this task; `getLedgerEntryCount` loses its only home consumer). Rework expectations:
- Headings are lowercase: `expect(html).toMatch(/<h2[^>]*>latest shows<\/h2>/)` and `/on this day/` (the date tail stays computed, e.g. `on this day · aug 16`).
- The card grid is gone: `expect(html).not.toMatch(/rounded-lg|surface-card|hover:-translate-y/)`.
- Figures render: `expect(html).toContain("Shows played")` becomes `expect(html).toContain("shows played")` — the Figure labels are lowercase; counts still computed from the fixture stats.
- The year ruler renders when `firstDate` exists: `expect(html).toContain("the record, 2016 → now")` (fixture's first year) and `expect(html).toContain("text-hand")`; and does NOT render without `firstDate`.
- Tonight: `live-pill` assertions become `TonightEntry` reality — `expect(html).toContain("tonight")`, `expect(html).toContain("bg-hand")`, `expect(html).toContain("the setlist will appear live")`, still filtered out of latest shows (keep the existing filter scenario, e.g. Red Rocks survives).
- Contents: `href="/songs"` + the computed sub (`"621 songs, sorted any way"` in the fixture) survive — labels lowercase.
- The minimal-branch tests are untouched.

Run: `npx vitest run app/page.test.tsx` — expected: FAIL against the old markup (that's the RED).

- [ ] **Step 2: Rewrite the fancy branch of `app/page.tsx`**

Imports: drop `ShowCard`, `SectionHeader`, `ArrowRight, Calendar, MapPin, Disc, Feather, Flame` (keep what the minimal branch uses), `getLedgerEntryCount`; add `SectionRule, Ledger, LedgerEntry, TonightEntry, ContentsRow, Figure` from `./_components/forms`, `TickRuler` from `./_components/instrument`, `PenNote` from `./_components/pen` if a caveat needs it (it doesn't on home — omit), and `yearOf` stays. Delete the `Stat` helper and `romanNumeral` + the nameplate JSX block entirely. Keep the `Promise.all` minus `getLedgerEntryCount()`.

The fancy/functional return becomes:

```tsx
  const sinceYear = stats.firstDate ? yearOf(stats.firstDate) : null;
  const currentYear = new Date().getFullYear();
  const todayLabel = onThisDay.length ? formatMonthDay(onThisDay[0].date).toLowerCase() : "";

  return (
    <>
      {/* ---- The record ---- */}
      <section>
        <Container className="pt-12 pb-10 sm:pt-16">
          <h1 className="max-w-3xl text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            every <span className="text-steel">Goose</span> show, indexed.
          </h1>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted">
            {compact(stats.showsPlayed)} shows{sinceYear ? ` since ${sinceYear}` : ""} — full setlists
            with segues and jams, every venue, every tour, and the story of each night.
          </p>
          <div className="mt-6 max-w-xl">
            <SearchBox size="full" />
          </div>
          <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-6">
            <Figure value={compact(stats.showsPlayed)} label="shows played" />
            <Figure value={compact(stats.performances)} label="songs played" />
            <Figure value={compact(stats.songs)} label="unique songs" />
            <Figure value={compact(stats.venues)} label="venues" />
            {sinceYear != null && (
              <span className="min-w-56 flex-1">
                <TickRuler
                  min={sinceYear}
                  max={currentYear}
                  majors={[
                    { at: sinceYear, label: String(sinceYear) },
                    { at: currentYear, label: String(currentYear) },
                  ]}
                  reading={{ at: currentYear, label: "now" }}
                />
                <span className="text-[0.68rem] lowercase text-faint">
                  the record, {sinceYear} → now
                </span>
              </span>
            )}
          </div>
        </Container>
      </section>

      {/* ---- Tonight ---- */}
      {tonight.length > 0 && (
        <section>
          <Container className="pb-6">
            <SectionRule title="tonight" seed="tonight" />
            <Ledger seed="tonight-ledger">
              {tonight.map((s) => (
                <TonightEntry key={s.showId} show={s} />
              ))}
            </Ledger>
          </Container>
        </section>
      )}

      {/* ---- On this day ---- */}
      {onThisDay.length > 0 && (
        <section>
          <Container className="pb-6">
            <SectionRule
              title={`on this day · ${todayLabel}`}
              seed="otd"
              href={onThisDay.length > 3 ? "/on-this-day" : undefined}
              linkLabel={`all ${onThisDay.length} shows`}
            />
            <Ledger seed="otd-ledger">
              {onThisDay.slice(0, 3).map((s) => (
                <LedgerEntry key={s.showId} show={s} />
              ))}
            </Ledger>
          </Container>
        </section>
      )}

      {/* ---- Latest shows ---- */}
      <section>
        <Container className="pb-6">
          <SectionRule title="latest shows" seed="latest" href="/shows" linkLabel="browse all shows" />
          <Ledger seed="latest-ledger">
            {recent.map((s) => (
              <LedgerEntry key={s.showId} show={s} />
            ))}
          </Ledger>
        </Container>
      </section>

      {/* ---- Upcoming + contents ---- */}
      <section>
        <Container className="grid gap-12 pb-16 lg:grid-cols-[1.3fr_1fr]">
          {upcoming.length > 0 && (
            <div>
              <SectionRule title="upcoming shows" seed="upcoming" />
              <Ledger seed="upcoming-ledger">
                {upcoming.map((s) => (
                  <LedgerEntry key={s.showId} show={s} />
                ))}
              </Ledger>
            </div>
          )}
          <div>
            <SectionRule title="browse the record" seed="contents" />
            <ContentsRow href="/shows" label="every show" sub={`${compact(stats.showsPlayed)} nights, by year & tour`} />
            <ContentsRow href="/songs" label="songs" sub={`${compact(stats.songsInCatalog)} songs, sorted any way`} />
            <ContentsRow href="/stats" label="stats" sub="cuts, gaps, and debuts" />
            <ContentsRow href="/venues" label="venues" sub={`${compact(stats.venues)} rooms across the map`} />
            <ContentsRow href="/tours" label="tours" sub="runs and eras, start to finish" />
          </div>
        </Container>
      </section>
    </>
  );
```

Preserve the existing tonight-filter logic above the return (`recent = recentRaw.filter(...)`) and its comment. The `upcoming` ledger renders future shows whose `songCount` is 0 — `LedgerEntry` already prints `—`, which reads correctly for a show not yet played.

- [ ] **Step 3: Run the page test**

Run: `npx vitest run app/page.test.tsx`
Expected: PASS. Common trip points: the lowercase month in `LedgerEntry` (`aug`, not `Aug`) — fixtures assert against rendered output, adjust expectations only if the *scenario* still holds; the `ContentsRow` subs keep their exact computed copy but the labels are lowercase.

- [ ] **Step 4: Full gate**

Run: `npm test && npm run typecheck`
Expected: green. A failure in another file naming `ShowCard`/`SectionHeader` means an un-migrated page's test broke — those components were NOT touched; investigate before changing anything (most likely an import you removed is still needed by the minimal branch).

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx app/page.test.tsx
git commit -m "feat(redesign): home as the first pen & instrument surface — figures, year ruler, ledgers, contents"
```

---

### Task 4: Checkpoint

**Files:** none; verification only.

- [ ] **Step 1: Full gate**

Run: `npm run typecheck && npm test && npm run build`
Expected: all green.

- [ ] **Step 2: Visual smoke (DB-free routes)**

`npx next dev -p 3100`; check `/definitely-not-a-page` (404) and `/blog` in fog and slate: masthead + footer wear the new chrome (lowercase footer with pen rule, underline search box, mobile-nav text trigger at narrow width). Home itself renders only with a DB — its behavior is covered by the fixture tests; flag in the report that home's visual pass waits for the user's eyeball or the Plan 5 screenshot pass. Stop the server.

- [ ] **Step 3: Ledger note**

Record in `sdd/progress.md`: plan 2 complete; `ShowCard`/`ShowRow`/`SectionHeader`/`show-list.tsx` now have fewer consumers and retire in plan 3; the on-this-day home section links `/on-this-day` only when >3 shows (same as before).

---

## Self-review (author's, already applied)

- **Spec coverage:** delivers the vocabulary rows "a show → ledger entry", "a list → ledger", "browse → contents", "a stat → figure", "live → yellow dot", the home page-by-page entry, and the chrome leftovers (search input hairline, footer, mobile nav, loading states). Folio lines, empty-state nils beyond the ledger's "—", and notes asides belong to plan 3 (show pages); charts to plan 4.
- **Placeholders:** every code step carries complete code; test-update steps name exact expectations.
- **Type consistency:** `SectionRule`/`Ledger`/`LedgerEntry`/`TonightEntry`/`ContentsRow`/`Figure` signatures match between Interfaces, tests, implementation, and the home rewrite; `TickRuler` call matches plan 1's shipped signature (`majors`, `reading`, no `seed`).
- **Copy check:** every number on home is computed (`compact(stats.*)`, `sinceYear`, `todayLabel`); the only authored strings are the tagline fragments and contents subs carried over from the current page, which already passed the copy rules; "the record, N → now" states only what the ruler draws.

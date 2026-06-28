# Functional Web 2.0 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the Functional experience as mid-2000s Web 2.0 on every page — glossy gel buttons, rounded gradient panels with soft shadows, zebra tables with gradient headers, badges, a BETA star, a gradient app-bar header, bold Helvetica, a sky-blue accent, on a light gradient background.

**Architecture:** Mostly a `[data-experience="functional"]` CSS layer that reskins the shared surfaces (`.surface-card`, `.eyebrow`, lists) used by the listing/home bodies, plus reusable `.gel`/`.w2-*` classes consumed by the functional-only components (header, footer, show header, setlist). Functional becomes single-look light (its theme toggle goes away).

**Tech Stack:** Tailwind v4 CSS-var tokens + plain Web 2.0 classes; Next.js server/client components; Vitest.

## Global Constraints

- Only Functional (`[data-experience="functional"]`) changes. Fancy and Minimal untouched.
- Functional becomes single-look light: `allowsTheme` returns true ONLY for fancy. The header already gates `<ThemeToggle/>` behind `allowsTheme`.
- Web 2.0 tokens: accent blue `#2f86cf` (gel `#5aa9e6→#2f86cf`); page bg `linear-gradient(#eef5fb,#d6e6f4)`; surfaces `#fff→#f1f7fc`; ink `#2a3a47`; sub `#5f7282`; hairline `#c4d4e2`; soft `#e7eef5`; jam gold `#f4a72b`; type `"Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif`.
- `.gel`/`.w2-*` classes are defined under `[data-experience="functional"]` and only used by functional components.
- `npm test`, `npm run typecheck`, `npm run build` pass. Never build while dev runs.

---

### Task 1: Functional Web 2.0 CSS foundation + single-look

**Files:** Modify `app/globals.css`; modify `lib/experience.ts`; modify `lib/experience.test.ts`.

- [ ] **Step 1: Update `allowsTheme` (functional → single-look)**

In `lib/experience.ts`, change:
```ts
export function allowsTheme(experience: Experience): boolean {
  return experience === "fancy";
}
```

- [ ] **Step 2: Update the test (RED→GREEN)**

In `lib/experience.test.ts`, the `allowsTheme` test currently asserts `allowsTheme("functional")` is `true`. Change that line to:
```ts
    expect(allowsTheme("functional")).toBe(false);
```
Run `npx vitest run lib/experience.test.ts` — it goes RED then GREEN once Step 1 is applied (apply Step 1 first if you prefer; the point is the suite is green after both).

- [ ] **Step 3: Replace the Functional CSS block**

In `app/globals.css`, replace the entire `:root[data-experience="functional"] { … }` block (the one that currently sets `--type-*` + steel `--gold*`) with the Web 2.0 palette + type, and append the Web 2.0 component/surface rules right after it:

```css
/* Functional — mid-2000s Web 2.0: glossy panels, gel buttons, zebra tables. */
:root[data-experience="functional"] {
  --bg: #e7f0f9;
  --bg-deep: #d6e6f4;
  --surface: #ffffff;
  --surface-2: #f1f7fc;
  --ink: #2a3a47;
  --muted: #5f7282;
  --faint: #8194a4;
  --line: #c4d4e2;
  --line-soft: #e7eef5;
  --gold: #2f86cf;
  --gold-soft: #2c7cc4;
  --gold-deep: #1f5e93;
  --sage: #5fa928;
  --sage-deep: #4d8c20;
  --ember: #f4a72b;
  --shadow: rgba(40, 70, 110, 0.18);
  --type-display: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;
  --type-body: "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif;
  --type-mono: "Helvetica Neue", Helvetica, Arial, sans-serif;
  color-scheme: light;
}
[data-experience="functional"] body {
  background: linear-gradient(#eef5fb, #d6e6f4) fixed;
}
[data-experience="functional"] h1, [data-experience="functional"] h2, [data-experience="functional"] h3 {
  font-weight: 800;
  letter-spacing: -0.015em;
}
[data-experience="functional"] .eyebrow { color: #2c7cc4; }
/* Glossy panels — reskins the shared .surface-card used across listing/home bodies. */
[data-experience="functional"] .surface-card {
  background: linear-gradient(#ffffff, #f1f7fc);
  border: 1px solid #c4d4e2;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(40, 70, 110, 0.18);
}
[data-experience="functional"] .surface-card > li:nth-child(even) { background: #eef5fb; }
[data-experience="functional"] .surface-card > li:hover { background: #fff7e0; }
/* Gel button (used by functional components). */
[data-experience="functional"] .gel {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid #2c7cc4;
  border-radius: 8px;
  background: linear-gradient(#5aa9e6, #2f86cf);
  color: #fff;
  font-weight: 700;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5), 0 1px 2px rgba(0, 0, 0, 0.22);
  text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.22);
  padding: 6px 12px;
  cursor: pointer;
}
[data-experience="functional"] .gel.green { border-color: #5fa928; background: linear-gradient(#9fd95f, #5fa928); }
/* App bar. */
[data-experience="functional"] .w2-appbar {
  background: linear-gradient(#4a9be0, #2c7cc4);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 2px 5px rgba(0, 0, 0, 0.18);
}
[data-experience="functional"] .w2-brand { color: #fff; font-weight: 800; text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.28); }
[data-experience="functional"] .w2-beta {
  display: inline-block; margin-left: 6px; transform: rotate(-4deg);
  background: linear-gradient(#ff9a4d, #f06a1a); border: 1px solid #d65510; border-radius: 4px;
  color: #fff; font-size: 9px; font-weight: 800; padding: 1px 5px; text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.25);
}
[data-experience="functional"] .w2-navlink { color: #fff; font-weight: 700; text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.2); border-radius: 6px; padding: 4px 10px; }
[data-experience="functional"] .w2-navlink:hover { background: rgba(255, 255, 255, 0.22); }
/* Glossy panel + badges (show header). */
[data-experience="functional"] .w2-panel {
  background: linear-gradient(#ffffff, #f1f7fc); border: 1px solid #c4d4e2; border-radius: 12px;
  box-shadow: 0 1px 4px rgba(40, 70, 110, 0.18); padding: 14px 16px;
}
[data-experience="functional"] .w2-badge {
  display: inline-flex; align-items: center; gap: 4px; border: 1px solid #aac6e0; border-radius: 18px;
  background: linear-gradient(#eaf4fd, #cfe6f8); color: #1f5e93; font-weight: 700; font-size: 11px;
  padding: 3px 11px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
}
[data-experience="functional"] .w2-badge.gold { border-color: #d9b24e; background: linear-gradient(#fff0c4, #f7d271); color: #7a560a; }
/* Zebra data table (setlist). */
[data-experience="functional"] table.w2-table { border-collapse: collapse; width: 100%; border-radius: 12px; overflow: hidden; border: 1px solid #c4d4e2; box-shadow: 0 1px 4px rgba(40, 70, 110, 0.18); }
[data-experience="functional"] table.w2-table thead th { background: linear-gradient(#4a9be0, #2c7cc4); color: #fff; text-align: left; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; padding: 8px 12px; text-shadow: 0 -1px 0 rgba(0, 0, 0, 0.22); }
[data-experience="functional"] table.w2-table tbody td { padding: 7px 12px; border-bottom: 1px solid #e7eef5; background: #fff; }
[data-experience="functional"] table.w2-table tbody tr:nth-child(even) td { background: #eef5fb; }
[data-experience="functional"] table.w2-table tbody tr:hover td { background: #fff7e0; }
[data-experience="functional"] .w2-star {
  display: inline-block; background: linear-gradient(#ffd86b, #f4a72b); border: 1px solid #d9952a; border-radius: 5px;
  color: #7a4e06; font-size: 10px; font-weight: 800; padding: 1px 5px; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
/* Gel-ify the experience switcher chrome inside functional. */
[data-experience="functional"] [aria-label="Experience mode"] { background: rgba(255, 255, 255, 0.18); border-color: rgba(255, 255, 255, 0.4); }
[data-experience="functional"] [aria-label="Experience mode"] button[aria-pressed="true"] { background: rgba(255, 255, 255, 0.3); color: #fff; }
[data-experience="functional"] [aria-label="Experience mode"] button { color: #eaf4fd; }
```

- [ ] **Step 4: Build + verify** — `npm run build` (no dev; `rm -rf .next` if a stale-`.next` ENOENT). `CSS=$(ls -t .next/static/css/*.css | head -1); grep -c 'data-experience=functional\]{[^}]*--gold:#2f86cf' "$CSS"` → 1; `grep -c 'table.w2-table' "$CSS"` → ≥1. `npm test` green (incl. the updated `allowsTheme` test).

- [ ] **Step 5: Commit**

```bash
git add app/globals.css lib/experience.ts lib/experience.test.ts
git commit -m "feat: functional Web 2.0 CSS foundation (gloss/gel/zebra) + single-look light"
```

---

### Task 2: Functional chrome — Web 2.0 app bar + footer

**Files:** Modify `app/_components/site-header.tsx` (the `HeaderFunctional` function only); modify `app/_components/site-footer.tsx` (the `FooterFunctional` function only); update `app/_components/site-header.test.tsx` if its functional assertion needs adjusting.

- [ ] **Step 1: Rewrite `HeaderFunctional`**

Replace the `HeaderFunctional` function body with:

```tsx
export function HeaderFunctional({ experience }: { experience: Experience }) {
  return (
    <header className="w2-appbar sticky top-0 z-40">
      <Container className="flex h-12 items-center justify-between gap-4">
        <Link href="/" className="w2-brand flex items-center text-[1.05rem]">
          Goose Almanac<span className="w2-beta">BETA</span>
        </Link>
        <nav className="hidden items-center gap-1 text-[0.8rem] md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="w2-navlink">{n.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block"><ExperienceSwitcher current={experience} /></div>
          <SearchBox />
          {allowsTheme(experience) && <ThemeToggle />}
          <MobileNav experience={experience} />
        </div>
      </Container>
    </header>
  );
}
```

- [ ] **Step 2: Rewrite `FooterFunctional`**

```tsx
export function FooterFunctional() {
  return (
    <footer className="mt-16 w2-appbar">
      <Container className="flex flex-col items-center justify-between gap-2 py-4 text-xs text-white sm:flex-row" style={{ textShadow: "0 -1px 0 rgba(0,0,0,.2)" }}>
        <span>© {new Date().getFullYear()} Goose Almanac · data from elgoose.net</span>
        <span>Not affiliated with Goose. Built by fans.</span>
      </Container>
    </footer>
  );
}
```

- [ ] **Step 3: Tests** — run `npx vitest run app/_components/site-header.test.tsx app/_components/site-footer.test.tsx`. The header functional test asserts `font-mono` + not `h-16`; update it: the functional header no longer uses `font-mono` (Web 2.0 is Helvetica). Change that assertion to check the Web 2.0 marker instead — `expect(html).toContain("w2-appbar")` and keep `expect(html).not.toContain("h-16")`. The footer functional test asserts `font-mono` + not "Browse"; change `font-mono` → `expect(html).toContain("w2-appbar")`, keep not-"Browse". Then `npm run typecheck` + `npm test`.

- [ ] **Step 4: Commit**

```bash
git add app/_components/site-header.tsx app/_components/site-footer.tsx app/_components/site-header.test.tsx app/_components/site-footer.test.tsx
git commit -m "feat: functional Web 2.0 chrome — gradient app bar + footer"
```

---

### Task 3: Functional show-page surfaces — glossy panel, badges, zebra setlist + gel toolbar

**Files:** Modify `app/_components/show-header.tsx` (the `if (experience === "functional")` branch only); modify `app/_components/setlist/functional.tsx`.

- [ ] **Step 1: Rewrite the functional ShowHeader branch**

Replace the `if (experience === "functional") { return ( … ) }` block in `app/_components/show-header.tsx` with:

```tsx
if (experience === "functional") {
  return (
    <Container className="py-5">
      <div className="w2-panel flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[1.7rem] font-extrabold leading-none tracking-tight text-ink">
            {dp.month} {dp.day}, {dp.year}
          </div>
          <div className="mt-1 text-sm font-semibold text-muted">
            {show.venueId ? <Link href={`/venues/${show.venueId}`} className="text-gold hover:underline">{show.venue}</Link> : (show.venue ?? "Unknown venue")}
            {loc ? ` · ${loc}` : ""}{show.tour ? ` · ${show.tour}` : ""}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="w2-badge">{setlist.length} songs</span>
            <span className="w2-badge">{setCount} {setCount === 1 ? "set" : "sets"}</span>
            {encores > 0 && <span className="w2-badge">{encores} enc</span>}
            {durationLogged && <span className="w2-badge gold">{durationLogged}</span>}
          </div>
        </div>
      </div>
    </Container>
  );
}
```

- [ ] **Step 2: Rewrite `SetlistFunctional` for Web 2.0**

Replace `app/_components/setlist/functional.tsx` (keep the client logic; restyle toolbar to `.gel`, table to `.w2-table`, jam to `.w2-star`):

```tsx
"use client";

import { useMemo, useState } from "react";
import { groupSets, isSegue } from "./shared";
import type { SetlistEntry } from "@/lib/queries/shows";
import { trackSeconds } from "@/lib/queries/format";

type Sort = "set" | "long" | "az";

export function SetlistFunctional({ entries }: { entries: SetlistEntry[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("set");
  const [jamsOnly, setJamsOnly] = useState(false);

  const rows = useMemo(() => {
    const groups = groupSets(entries);
    let flat = groups.flatMap((g) => g.entries.map((e, i) => ({ e, set: i === 0 ? g.label : "", n: i + 1 })));
    if (q.trim()) flat = flat.filter((r) => r.e.song.toLowerCase().includes(q.trim().toLowerCase()));
    if (jamsOnly) flat = flat.filter((r) => r.e.isJamchart);
    if (sort === "az") flat = [...flat].sort((a, b) => a.e.song.localeCompare(b.e.song));
    if (sort === "long") flat = [...flat].sort((a, b) => (trackSeconds(b.e.trackTime) ?? 0) - (trackSeconds(a.e.trackTime) ?? 0));
    return flat;
  }, [entries, q, sort, jamsOnly]);

  if (entries.length === 0) {
    return <p className="text-muted">No setlist has been recorded for this show yet.</p>;
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter songs…"
          aria-label="Filter songs"
          className="h-8 min-w-[8rem] flex-1 rounded-full border border-[#aebfce] bg-white px-4 text-sm text-ink shadow-[inset_0_1px_2px_rgba(0,0,0,0.09)] outline-none"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Sort" className="gel border-0 text-xs">
          <option value="set">Sort: Set order</option>
          <option value="long">Sort: Longest</option>
          <option value="az">Sort: A–Z</option>
        </select>
        <button type="button" onClick={() => setJamsOnly((v) => !v)} aria-pressed={jamsOnly} className={`gel green text-xs ${jamsOnly ? "" : "opacity-75"}`}>
          ★ Jams only
        </button>
      </div>
      <table className="w2-table text-sm">
        <thead>
          <tr>
            <th>Set</th>
            <th>#</th>
            <th className="w-full">Song</th>
            <th aria-label="Segue">→</th>
            <th className="text-right">Time</th>
            <th>Jam</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.e.uniqueId}>
              <td className="text-faint">{r.set}</td>
              <td className="tabular-nums text-faint">{r.n}</td>
              <td className="font-semibold text-ink">{r.e.song}</td>
              <td className="font-extrabold text-gold">{isSegue(r.e.transition) ? "›" : ""}</td>
              <td className="text-right tabular-nums text-muted">{r.e.trackTime ?? "—"}</td>
              <td>{r.e.isJamchart ? <span className="w2-star">★ JAM</span> : <span className="text-faint">·</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

(The `functional.test.tsx` still asserts `<table`, song names, `›`, and "Filter songs" — all still present, so it stays green. If it asserted the old `border-collapse` class string specifically, relax that to `<table`.)

- [ ] **Step 3: Tests** — `npx vitest run app/_components/setlist/functional.test.tsx app/_components/show-header.test.tsx`, then `npm run typecheck` + `npm test`. Fix any stale class-string assertion as noted.

- [ ] **Step 4: Commit**

```bash
git add app/_components/show-header.tsx app/_components/setlist/functional.tsx app/_components/setlist/functional.test.tsx
git commit -m "feat: functional Web 2.0 show page — glossy panel, stat badges, zebra setlist, gel toolbar"
```

---

### Task 4: Verify + ship

- [ ] **Step 1: Full gate** — stop dev, `npm test`, `npm run typecheck`, `npm run build` (all pass).
- [ ] **Step 2: CSS** — `CSS=$(ls -t .next/static/css/*.css | head -1); grep -c 'data-experience=functional\]{[^}]*--gold:#2f86cf' "$CSS"` → 1; `grep -c 'w2-appbar' "$CSS"` → ≥1; `grep -c 'table.w2-table' "$CSS"` → ≥1.
- [ ] **Step 3: Mark spec built** — in `docs/superpowers/specs/2026-06-28-functional-web20.md`, `Status: proposed` → `Status: built 2026-06-28`; commit.
- [ ] **Step 4: (controller) merge to main, deploy, live-verify** — confirm functional renders Web 2.0 on `/` (glossy panels, gel/app-bar), a show page (glossy header panel + badges + zebra setlist + gel toolbar + ★ JAM), and a listing page (glossy cards + zebra rows); no theme toggle in functional; fancy + minimal unchanged.

---

## Self-Review

**Spec coverage:** palette/type/bg/gloss/gel/zebra/badges CSS + single-look → Task 1; app-bar header + footer → Task 2; show glossy panel + badges + zebra setlist + gel toolbar → Task 3; verify → Task 4. The listing/home bodies are reskinned by Task 1's `.surface-card`/`.eyebrow`/list rules (they render the shared markup). ✓

**Placeholder scan:** CSS + component code is complete; test-assertion updates are spelled out (mono→w2-appbar). Commands have expected output.

**Type consistency:** `allowsTheme` signature unchanged (behavior change only); `HeaderFunctional`/`FooterFunctional`/`SetlistFunctional`/`ShowHeader` props unchanged. The `.gel`/`.w2-*` class names in Task 1's CSS match those used by the components in Tasks 2–3.

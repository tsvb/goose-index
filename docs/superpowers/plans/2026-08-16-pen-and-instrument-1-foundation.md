# Pen & Instrument — Plan 1 of 5: Foundation & Chrome

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the five-theme card foundation with the pen & instrument token base (fog/slate), the seeded pen kit, the instrument kit, and the new masthead — leaving every page working and every test green.

**Architecture:** New color/type tokens land first with *legacy aliases* (`--gold → var(--steel)` etc.), so the entire site re-tempers instantly through the existing `@theme inline` map while un-migrated pages keep rendering; a de-carding bridge squares corners and kills lift site-wide. Then the theme model shrinks to auto/fog/slate, webfonts are removed, and the two drawing kits (pen = seeded wobbly SVG, instrument = crisp tick rulers) arrive with tests. Later plans (2–5) rebuild pages on these primitives.

**Tech Stack:** Next.js App Router, Tailwind v4 (`@theme inline` in `app/globals.css`), Vitest + `react-dom/server` `renderToStaticMarkup` string assertions. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-16-pen-and-instrument-design.md` — read it first; it defines every color role and form.

## Global Constraints

- Fonts: `-apple-system, system-ui, sans-serif` body/display; `ui-monospace, SFMono-Regular, Menlo, monospace` for mono. **No webfonts, no `next/font` imports anywhere.**
- Fog values: paper `#f3f5f7`, ink `#1f242b`, muted `#5d6672`, faint `#8b95a1`, steel `#46708f`, hand `#d9a406`, spruce `#47776b`, pencil `#7b8590`, line `rgba(31,36,43,.28)`, line-soft `rgba(31,36,43,.13)`.
- Slate values: paper `#22262d`, ink `#e8ecf1`, muted `#aab3bd`, faint `#7e8894`, steel `#7ba3c4`, hand `#f2b705`, spruce `#7fae9f`, pencil `#98a1ab`, line `rgba(232,236,241,.3)`, line-soft `rgba(232,236,241,.14)`.
- One meaning per color: ink=content, steel=structure, hand=now/the reading, spruce=links only, pencil=the human margin.
- Motion budget: only the live dot pulses; no entrance animations, no hover lift/shadow/translate.
- Pen wobble is **deterministic** — seeded from a stable string key, never `Math.random()`.
- Site chrome copy is lowercase; authored content keeps its casing. All copy obeys the six CLAUDE.md rules.
- Every task ends with `npm test` green (597 baseline tests, minus/plus this plan's changes) and is committed.
- Work happens in the worktree `.claude/worktrees/pen-and-instrument` on branch `redesign/pen-and-instrument`. The main checkout runs another session's dev server — never `cd` out of the worktree; dev servers for smoke checks use port **3100**.

## Roadmap (this plan is 1 of 5)

1. **Foundation & chrome** (this document): tokens, theme model, fonts, pen kit, instrument kit, masthead, settings.
2. **Core forms & home**: ShowEntry/LedgerRow/ContentsRow/folio/figures, home page rebuild, search box, footer, mobile nav, skeletons.
3. **The pages**: shows, show page (setlist re-temper, notes), songs, song page, venues, tours, years, on-this-day, search, 404/loading.
4. **The instruments**: /stats charts re-skinned, career/tour timelines as tick rulers, gap gauges, pen caveats.
5. **2.0 re-cut & retirement**: functional skin rewritten against new markup, legacy alias removal, dead CSS purge, screenshot + copy + contrast audit.

---

### Task 1: The token base — fog & slate with legacy aliases

**Files:**
- Modify: `app/globals.css` (sections: runtime tokens `:root`/`[data-theme=…]` blocks at the top of the file; type tokens `:root` block near `@theme inline`; `@theme inline`; `@layer base`)

**Interfaces:**
- Produces: CSS custom properties `--paper --ink --muted --faint --steel --hand --spruce --pencil --line --line-soft` on `:root` (fog), re-declared under slate (see Step 3); legacy aliases `--bg --bg-deep --surface --surface-2 --gold --gold-soft --gold-deep --sage --sage-deep --ember --shadow`; Tailwind utilities `text-steel`, `bg-paper`, `text-hand`, `text-spruce`, `text-pencil` (+ all existing `text-gold`-style utilities, now aliased). Every later task and plan uses these.

- [ ] **Step 1: Survey what will be deleted**

Run: `grep -n 'data-theme' app/globals.css | wc -l` and `grep -n 'data-theme' app/globals.css | head -80`

Expected: ~100+ hits — the five theme token blocks (`[data-theme="light"]`, `"dark"`, `"pod"`, `"xl2"`, `"registrar"`) and every theme-scoped reskin rule (almanac masthead/nameplate/entry-stamp/folio blocks, xl2/registrar body/heading/chart overrides). All of these rules die in this task. Note the line ranges before editing.

- [ ] **Step 2: Replace the `:root` runtime token block**

The current `:root` block (the one beginning `--bg: #15110c;`) becomes the fog block. Replace it entirely with:

```css
/* ---- Pen & instrument tokens ----
   One meaning per color (spec 2026-08-16): ink=content · steel=the record's
   structure · hand=now and the reading · spruce=links only · pencil=the human
   margin. Fog is the light page; slate (below) the dark. Legacy names alias
   the new roles so un-migrated utilities re-temper instead of breaking; the
   aliases die with Plan 5. */
:root {
  --paper: #f3f5f7;
  --ink: #1f242b;
  --muted: #5d6672;
  --faint: #8b95a1;
  --steel: #46708f;
  --hand: #d9a406;
  --spruce: #47776b;
  --pencil: #7b8590;
  --line: rgba(31, 36, 43, 0.28);
  --line-soft: rgba(31, 36, 43, 0.13);
  color-scheme: light;

  /* Legacy aliases — Plan 5 removes these with their last consumers. */
  --bg: var(--paper);
  --bg-deep: var(--paper);
  --surface: var(--paper);
  --surface-2: color-mix(in oklab, var(--ink) 5%, var(--paper));
  --gold: var(--steel);
  --gold-soft: var(--steel);
  --gold-deep: var(--steel);
  --sage: var(--spruce);
  --sage-deep: var(--spruce);
  --ember: var(--hand);
  --shadow: transparent;
}
```

- [ ] **Step 3: Add the slate blocks, delete the five theme blocks**

Immediately after the new `:root` block, add (the duplication between the two slate selectors is deliberate — a media query cannot share a rule body with an attribute selector):

```css
/* Slate — the dark cave. Follows the system unless the visitor pins fog;
   an explicit slate pin wins in both directions. */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="fog"]) {
    --paper: #22262d;
    --ink: #e8ecf1;
    --muted: #aab3bd;
    --faint: #7e8894;
    --steel: #7ba3c4;
    --hand: #f2b705;
    --spruce: #7fae9f;
    --pencil: #98a1ab;
    --line: rgba(232, 236, 241, 0.3);
    --line-soft: rgba(232, 236, 241, 0.14);
    color-scheme: dark;
  }
}
:root[data-theme="slate"] {
  --paper: #22262d;
  --ink: #e8ecf1;
  --muted: #aab3bd;
  --faint: #7e8894;
  --steel: #7ba3c4;
  --hand: #f2b705;
  --spruce: #7fae9f;
  --pencil: #98a1ab;
  --line: rgba(232, 236, 241, 0.3);
  --line-soft: rgba(232, 236, 241, 0.14);
  color-scheme: dark;
}
```

Then delete **every** remaining rule whose selector mentions `data-theme` — the `[data-theme="light"|"dark"|"pod"|"xl2"|"registrar"]` token blocks and all theme-scoped reskins (almanac masthead/nameplate/entry-stamp/entry-folio/setlist/tape/notes blocks, xl2 and registrar body/heading/chart/scrollbar/selection overrides). Verify with:

Run: `grep -c 'data-theme' app/globals.css`
Expected: `2` (the two slate selectors added above)

- [ ] **Step 4: System fonts in the type tokens; new names in the Tailwind map**

Replace the `--type-*` block (currently `var(--font-bricolage)` etc.) with:

```css
:root {
  --type-display: -apple-system, system-ui, sans-serif;
  --type-body: -apple-system, system-ui, sans-serif;
  --type-mono: ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

In the `@theme inline` block, add the new color names after the existing entries (keep the legacy entries — they alias through):

```css
  --color-paper: var(--paper);
  --color-steel: var(--steel);
  --color-hand: var(--hand);
  --color-spruce: var(--spruce);
  --color-pencil: var(--pencil);
```

- [ ] **Step 5: Base layer — selection, focus, numerals, the de-carding bridge**

In `@layer base`: change `::selection` to `background: var(--steel); color: var(--paper);` and the `:focus-visible` outline color to `var(--steel)`. Headings: `font-weight: 600; letter-spacing: -0.01em;` (drop the 460 variable-font weight — system faces don't carry it). Add after the base layer:

```css
/* Tabular figures wherever data is set in mono. */
.font-mono { font-variant-numeric: tabular-nums; }

/* ---- De-carding bridge (dies with Plan 5) ----
   Until every page is rebuilt on the new forms, nothing floats and nothing
   is a rounded box. rounded-full is exempt so icon circles stay circles
   until their components retire. */
[data-experience="fancy"] .surface-card {
  background: transparent;
  border: 0;
  border-top: 1px solid var(--line-soft);
  border-bottom: 1px solid var(--line-soft);
  border-radius: 0;
}
[data-experience="fancy"] :is(.rounded, .rounded-md, .rounded-lg, .rounded-xl) {
  border-radius: 0;
}
[data-experience="fancy"] .hover\:-translate-y-0\.5:hover { transform: none; }
[data-experience="fancy"] [class*="hover:shadow"]:hover { box-shadow: none; }
```

Also delete the `.rise` keyframes/class, `.stage-glow`, and `.grain-overlay` rule blocks (motion budget: only the live dot pulses; the classes remain harmlessly in un-migrated markup until Plans 2–3 remove them). Keep `.live-dot`/`.live-pill` — their ember references now read hand yellow via the alias.

- [ ] **Step 6: Typecheck, test, eyeball**

Run: `npm run typecheck && npm test`
Expected: PASS. CSS is untested directly; failures here mean a test asserts on a deleted class string — fix the *component test expectation only if the component itself changed*, otherwise leave both alone (components are untouched in this task).

Run: `npx next dev -p 3100` briefly, load `http://localhost:3100/` — the site should read cool (fog or slate per your OS), system type, square corners, no floating cards. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add app/globals.css
git commit -m "feat(redesign): fog/slate token base with legacy aliases + de-carding bridge"
```

---

### Task 2: The theme model — auto / fog / slate

**Files:**
- Modify: `lib/theme.ts` (full rewrite below)
- Modify: `lib/theme.test.ts` (full rewrite below)
- Modify: `app/_components/settings-panel.tsx` (theme section)
- Modify: `app/_components/settings-menu.tsx` (`chooseTheme`, initial state)
- Modify: `app/_components/settings-panel.test.tsx`, `app/_components/settings-menu.test.tsx` (update theme expectations)

**Interfaces:**
- Consumes: nothing new.
- Produces: `type Theme = "auto" | "fog" | "slate"`; `THEME_VALUES: Theme[]`; `DEFAULT_THEME: Theme` (= `"auto"`); `PINNED_THEMES: readonly ["fog","slate"]`; `resolveTheme(value: string | null | undefined): Theme | null`; `themeScript: string`. Task 3 (layout) and the settings UI rely on exactly these names.

- [ ] **Step 1: Rewrite the theme test to describe the new model**

Replace `lib/theme.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { THEME_VALUES, PINNED_THEMES, DEFAULT_THEME, resolveTheme, themeScript } from "./theme";

// The theme model is three-valued: auto (follow the system — the default and
// the absence of a data-theme attribute) plus the two pins, fog and slate.
// The pre-paint script applies only pins; auto must NOT set an attribute, or
// the prefers-color-scheme media query could never decide.
describe("theme", () => {
  it("defaults to auto, which is a real option", () => {
    expect(DEFAULT_THEME).toBe("auto");
    expect(THEME_VALUES).toContain(DEFAULT_THEME);
  });

  it("pins are exactly fog and slate, and both survive a reload", () => {
    expect([...PINNED_THEMES]).toEqual(["fog", "slate"]);
    for (const t of PINNED_THEMES) {
      expect(themeScript).toContain(`t==='${t}'`);
    }
  });

  it("the pre-paint script never pins auto", () => {
    expect(themeScript).not.toContain("t==='auto'");
    expect(themeScript).toContain("localStorage.getItem('ga-theme')");
    expect(themeScript).toContain("setAttribute('data-theme'");
  });

  it("rejects junk and the five retired theme names", () => {
    for (const legacy of ["xl2", "pod", "registrar", "light", "dark"]) {
      expect(resolveTheme(legacy)).toBeNull();
    }
    expect(resolveTheme("")).toBeNull();
    expect(resolveTheme(null)).toBeNull();
    expect(resolveTheme(undefined)).toBeNull();
    expect(resolveTheme("fog; drop table")).toBeNull();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run lib/theme.test.ts`
Expected: FAIL — `PINNED_THEMES` is not exported; default is `xl2`.

- [ ] **Step 3: Rewrite `lib/theme.ts`**

```ts
export type Theme = "auto" | "fog" | "slate";

/** Every appearance the menu offers. Auto follows prefers-color-scheme. */
export const THEME_VALUES: Theme[] = ["auto", "fog", "slate"];

/** The two values that may appear in the data-theme attribute. Auto is the
 * *absence* of the attribute — setting it would override the media query. */
export const PINNED_THEMES = ["fog", "slate"] as const;

export const DEFAULT_THEME: Theme = "auto";

/** Narrow an untrusted value (localStorage, DOM attribute) to a Theme. */
export function resolveTheme(value: string | null | undefined): Theme | null {
  return THEME_VALUES.includes(value as Theme) ? (value as Theme) : null;
}

/** Re-applies a saved pin before first paint. The allowlist is generated from
 * PINNED_THEMES so a pin can't be saved on click and ignored on reload. */
export const themeScript = `(function(){try{var t=localStorage.getItem('ga-theme');if(${PINNED_THEMES.map(
  (v) => `t==='${v}'`,
).join("||")}){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
```

- [ ] **Step 4: Run the theme test again**

Run: `npx vitest run lib/theme.test.ts`
Expected: PASS

- [ ] **Step 5: Settings panel — appearance as three text options**

In `app/_components/settings-panel.tsx`: delete the `ICONS`/`LABELS`/`THEMES` records and the icon imports (`Cassette, Disc, Moon, Sun, Tag` — keep any icon the experience section still uses; currently it uses none). Replace with:

```tsx
const THEME_LABELS: Record<Theme, string> = {
  auto: "auto",
  fog: "fog",
  slate: "slate",
};
export const THEMES = THEME_VALUES.map((value) => ({ value, label: THEME_LABELS[value] }));
```

Replace the appearance `<div role="group" …>` grid with a plain text row (no pills, no icons — controls are underlined lowercase text per the spec):

```tsx
<div role="group" aria-label="appearance" className="flex gap-4">
  {THEMES.map((t) => {
    const pressed = theme === t.value;
    return (
      <button
        key={t.value}
        type="button"
        onClick={() => onSelectTheme(t.value)}
        aria-pressed={pressed}
        className={clsx(
          "text-[0.8rem] lowercase underline-offset-4 transition",
          pressed ? "text-steel underline font-semibold" : "text-muted underline hover:text-ink",
        )}
      >
        {t.label}
      </button>
    );
  })}
</div>
```

On the panel's wrapper div, replace `rounded-xl border border-line bg-surface p-3.5 … shadow-…` with `border-y border-line bg-paper p-3.5 text-ink` (a ruled sheet, not a floating card). Change the two `<p>` section labels to lowercase text (`experience`, `appearance`). In the experience option buttons, replace `rounded-lg` with nothing and the selected classes `bg-gold/15 ring-1 ring-gold/40` with `text-steel underline underline-offset-4`; unselected hover `hover:bg-line/40` becomes `hover:text-ink`. Replace the `themeAllowed ? … : <p>Themes apply in the 3.0 experience.</p>` fallback copy with `appearance applies in the 3.0 experience.` (lowercase chrome).

- [ ] **Step 6: Settings menu — auto clears the pin**

In `app/_components/settings-menu.tsx` replace `chooseTheme` with:

```tsx
function chooseTheme(next: Theme) {
  setTheme(next);
  if (next === "auto") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", next);
  }
  try {
    if (next === "auto") localStorage.removeItem("ga-theme");
    else localStorage.setItem("ga-theme", next);
  } catch {
    /* ignore */
  }
}
```

The initial-state effect stays as-is (`saved ?? attr ?? DEFAULT_THEME` now resolves to `"auto"` when nothing is pinned, since `resolveTheme` rejects absent attributes).

- [ ] **Step 7: Update the two settings component tests**

Run: `npx vitest run app/_components/settings-panel.test.tsx app/_components/settings-menu.test.tsx`
Expected: FAIL on assertions naming the old themes ("XL II", "Pod", "Registrar", icon markup, `rounded-xl`).

Update expectations only — the tests keep their scenarios but assert the new reality: `THEMES` has three entries labeled `auto`/`fog`/`slate`; the pressed option carries `aria-pressed="true"` and `text-steel`; the panel wrapper contains `border-y` and does **not** contain `rounded-xl` or `shadow`; the fallback copy is `appearance applies in the 3.0 experience.`. Re-run: PASS.

- [ ] **Step 8: Full suite, commit**

Run: `npm test`
Expected: PASS (a failure naming `xl2`/`Registrar` in another file means that file's test pins the old wardrobe — update that expectation the same way).

```bash
git add lib/theme.ts lib/theme.test.ts app/_components/settings-panel.tsx app/_components/settings-menu.tsx app/_components/settings-panel.test.tsx app/_components/settings-menu.test.tsx
git commit -m "feat(redesign): three-value theme model — auto follows the system, fog/slate pin"
```

---

### Task 3: Layout sheds the webfonts

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/layout` tests if any assert on fonts (check: `grep -rn "bricolage\|font-" app/*.test.tsx`)

**Interfaces:**
- Consumes: `themeScript` from Task 2 (unchanged name).
- Produces: an `<html>` element with **no** `data-theme` attribute by default and no font variable classes. Later plans rely on `data-theme` being absent in auto mode.

- [ ] **Step 1: Strip fonts and the pinned default**

In `app/layout.tsx`:
- Delete the entire `next/font/google` import and all nine font constant declarations (`bricolage` through `fraunces`) and their explanatory comments.
- Remove `DEFAULT_THEME` from the `@/lib/theme` import (keep `themeScript`).
- Change the `<html>` element: remove `data-theme={DEFAULT_THEME}` and the `className={…font variables…}` entirely (keep `lang`, `data-experience`, `suppressHydrationWarning`).
- Delete the `{experience === "fancy" && <div className="grain-overlay" aria-hidden />}` line.

- [ ] **Step 2: Verify no `next/font` remains anywhere**

Run: `grep -rn "next/font" app lib`
Expected: no output.

- [ ] **Step 3: Typecheck, test, commit**

Run: `npm run typecheck && npm test`
Expected: PASS (fix any layout/page test asserting `data-theme="xl2"` or font classes — assert the absence instead: rendered `<html>` markup contains no `data-theme` when nothing is pinned).

```bash
git add app/layout.tsx
git commit -m "feat(redesign): system font only — drop all nine webfonts and the pinned default theme"
```

---

### Task 4: The pen kit

**Files:**
- Create: `app/_components/pen.tsx`
- Create: `app/_components/pen.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces (exact signatures — Plans 2–4 build every ledger and margin on these):
  - `penRandom(seed: string): () => number` — deterministic [0,1) stream.
  - `PenRule({ seed, strength = "strong", className }: { seed: string; strength?: "strong" | "faint"; className?: string })` — full-width wobbly horizontal rule, `currentColor`, wrapped in a `text-pencil` default.
  - `PenNote({ children, className }: { children: React.ReactNode; className?: string })` — pencil italic margin note (`<p>`).
  - `PenArrow({ seed, direction = "left", className }: { seed: string; direction?: "left" | "right"; className?: string })` — small hand arrow.
  - `PenCircle({ seed, className }: { seed: string; className?: string })` — hand ellipse for one-per-section emphasis, absolutely positioned by the caller.

- [ ] **Step 1: Write the failing test**

Create `app/_components/pen.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { penRandom, PenRule, PenNote, PenArrow, PenCircle } from "./pen";

describe("penRandom", () => {
  it("is deterministic per seed", () => {
    const a1 = penRandom("ledger-1"), a2 = penRandom("ledger-1"), b = penRandom("ledger-2");
    const seqA1 = [a1(), a1(), a1()], seqA2 = [a2(), a2(), a2()], seqB = [b(), b(), b()];
    expect(seqA1).toEqual(seqA2);
    expect(seqA1).not.toEqual(seqB);
  });
  it("stays in [0, 1)", () => {
    const r = penRandom("bounds");
    for (let i = 0; i < 200; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("PenRule", () => {
  it("renders the same path for the same seed (SSR-stable)", () => {
    expect(renderToStaticMarkup(<PenRule seed="s1" />)).toBe(renderToStaticMarkup(<PenRule seed="s1" />));
  });
  it("different seeds draw different strokes", () => {
    expect(renderToStaticMarkup(<PenRule seed="s1" />)).not.toBe(renderToStaticMarkup(<PenRule seed="s2" />));
  });
  it("is decorative and pencil-coloured", () => {
    const html = renderToStaticMarkup(<PenRule seed="s1" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain("text-pencil");
    expect(html).toContain('preserveAspectRatio="none"');
  });
  it("faint strength thins the stroke", () => {
    const strong = renderToStaticMarkup(<PenRule seed="s1" />);
    const faint = renderToStaticMarkup(<PenRule seed="s1" strength="faint" />);
    expect(faint).toContain("opacity");
    expect(strong).not.toBe(faint);
  });
});

describe("PenNote", () => {
  it("is a pencil italic paragraph", () => {
    const html = renderToStaticMarkup(<PenNote>only 25 mondays</PenNote>);
    expect(html).toContain("<p");
    expect(html).toContain("text-pencil");
    expect(html).toContain("italic");
    expect(html).toContain("only 25 mondays");
  });
});

describe("PenArrow / PenCircle", () => {
  it("render deterministic decorative SVGs", () => {
    expect(renderToStaticMarkup(<PenArrow seed="a" />)).toBe(renderToStaticMarkup(<PenArrow seed="a" />));
    expect(renderToStaticMarkup(<PenCircle seed="c" />)).toBe(renderToStaticMarkup(<PenCircle seed="c" />));
    expect(renderToStaticMarkup(<PenArrow seed="a" />)).toContain('aria-hidden="true"');
    expect(renderToStaticMarkup(<PenCircle seed="c" />)).toContain('aria-hidden="true"');
  });
  it("arrow flips with direction", () => {
    expect(renderToStaticMarkup(<PenArrow seed="a" direction="left" />)).not.toBe(
      renderToStaticMarkup(<PenArrow seed="a" direction="right" />),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/_components/pen.test.tsx`
Expected: FAIL — module `./pen` does not exist.

- [ ] **Step 3: Implement `app/_components/pen.tsx`**

```tsx
import { clsx } from "./clsx";

/** Deterministic [0,1) stream from a string seed (FNV-1a into xorshift-ish
 * mixing). The pen must draw the same stroke on server, client, and in tests —
 * Math.random() would tear hydration. */
export function penRandom(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 13), 1597334677);
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** Wobbly full-width horizontal rule — the pen's section/entry separator.
 * strength "strong" heads a section; "faint" separates entries. */
export function PenRule({
  seed,
  strength = "strong",
  className,
}: {
  seed: string;
  strength?: "strong" | "faint";
  className?: string;
}) {
  const r = penRandom(seed);
  const y = () => (2.2 + r() * 1.8).toFixed(2);
  const d = `M2 ${y()} C ${(40 + r() * 60).toFixed(0)} ${y()}, ${(120 + r() * 60).toFixed(0)} ${y()}, ${(
    200 + r() * 40
  ).toFixed(0)} ${y()} S ${(320 + r() * 50).toFixed(0)} ${y()}, 398 ${y()}`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 6"
      preserveAspectRatio="none"
      className={clsx("block h-[6px] w-full text-pencil", className)}
      style={strength === "faint" ? { opacity: 0.45 } : undefined}
      fill="none"
    >
      <path d={d} stroke="currentColor" strokeWidth={strength === "strong" ? 1.4 : 1.1} strokeLinecap="round" />
    </svg>
  );
}

/** Pencil italic margin note — the human caveat channel. Copy must be
 * computed at render time (CLAUDE.md rule 5); this component only dresses it. */
export function PenNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("text-[0.78rem] italic text-pencil", className)}>{children}</p>;
}

/** Small hand-drawn arrow. Default points left (margin note → subject). */
export function PenArrow({
  seed,
  direction = "left",
  className,
}: {
  seed: string;
  direction?: "left" | "right";
  className?: string;
}) {
  const r = penRandom(seed);
  const bend = (8 + r() * 8).toFixed(0);
  const d = `M56 ${bend} C 40 ${(Number(bend) - 4).toFixed(0)}, 18 ${(10 + r() * 6).toFixed(0)}, 6 26 M6 26 l 8 -2 M6 26 l 3 -8`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 40"
      className={clsx("h-[36px] w-[52px] text-pencil", direction === "right" && "-scale-x-100", className)}
      fill="none"
    >
      <path d={d} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Hand ellipse for emphasis — at most one per section (spec: emphasis that is
 * everywhere is emphasis nowhere). Position it absolutely from the caller. */
export function PenCircle({ seed, className }: { seed: string; className?: string }) {
  const r = penRandom(seed);
  const d = `M12 23 C ${(8 + r() * 6).toFixed(0)} ${(6 + r() * 4).toFixed(0)}, ${(34 + r() * 8).toFixed(0)} 2, 58 6 S 88 ${(
    14 + r() * 8
  ).toFixed(0)}, 78 32 S ${(36 + r() * 8).toFixed(0)} 46, 20 40 S 8 32, 14 20`;
  return (
    <svg aria-hidden="true" viewBox="0 0 90 46" className={clsx("text-pencil", className)} fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run app/_components/pen.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/_components/pen.tsx app/_components/pen.test.tsx
git commit -m "feat(redesign): pen kit — seeded deterministic wobble (rule, note, arrow, circle)"
```

---

### Task 5: The instrument kit

**Files:**
- Create: `app/_components/instrument.tsx`
- Create: `app/_components/instrument.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces (Plans 2 and 4 consume these exact signatures):
  - `TickRuler({ min, max, majors, reading, className }: { min: number; max: number; majors: { at: number; label: string }[]; reading?: { at: number; label?: string }; className?: string })` — horizontal scale; minor ticks derived (10 even divisions), majors taller + labeled, optional yellow hand at `reading.at` with visually-hidden label text.
  - `Gauge({ min, max, value, unit, className }: { min: number; max: number; value: number; unit: string; className?: string })` — a TickRuler wrapper whose reading is `value`, rendering `value` + `unit` as visible text beside the scale (color never the sole carrier).

- [ ] **Step 1: Write the failing test**

Create `app/_components/instrument.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TickRuler, Gauge } from "./instrument";

const majors = [
  { at: 2014, label: "2014" },
  { at: 2020, label: "2020" },
  { at: 2026, label: "2026" },
];

describe("TickRuler", () => {
  it("labels every major tick", () => {
    const html = renderToStaticMarkup(<TickRuler min={2014} max={2026} majors={majors} />);
    for (const m of majors) expect(html).toContain(m.label);
  });
  it("draws the yellow hand at the reading and names it", () => {
    const html = renderToStaticMarkup(
      <TickRuler min={2014} max={2026} majors={majors} reading={{ at: 2026, label: "now" }} />,
    );
    expect(html).toContain("text-hand");
    expect(html).toContain("now");
  });
  it("no reading, no hand", () => {
    const html = renderToStaticMarkup(<TickRuler min={2014} max={2026} majors={majors} />);
    expect(html).not.toContain("text-hand");
  });
  it("is crisp — instruments never wobble", () => {
    const html = renderToStaticMarkup(<TickRuler min={0} max={10} majors={[{ at: 0, label: "0" }]} />);
    expect(html).not.toContain("text-pencil");
  });
  it("clamps a reading outside the scale to the scale's edge", () => {
    const inRange = renderToStaticMarkup(
      <TickRuler min={0} max={100} majors={[{ at: 0, label: "0" }]} reading={{ at: 100 }} />,
    );
    const beyond = renderToStaticMarkup(
      <TickRuler min={0} max={100} majors={[{ at: 0, label: "0" }]} reading={{ at: 250 }} />,
    );
    expect(beyond).toBe(inRange);
  });
});

describe("Gauge", () => {
  it("always writes the value next to the pointer — colour never carries alone", () => {
    const html = renderToStaticMarkup(<Gauge min={0} max={100} value={74} unit="shows" />);
    expect(html).toContain("74");
    expect(html).toContain("shows");
    expect(html).toContain("text-hand");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/_components/instrument.test.tsx`
Expected: FAIL — module `./instrument` does not exist.

- [ ] **Step 3: Implement `app/_components/instrument.tsx`**

```tsx
import { clsx } from "./clsx";

const W = 400;
const PAD = 4;
const BASE = 18;

function x(at: number, min: number, max: number): number {
  const t = max === min ? 0 : (Math.min(Math.max(at, min), max) - min) / (max - min);
  return PAD + t * (W - 2 * PAD);
}

/** Horizontal tick scale — the Braun face. Ten even minor ticks, taller
 * labeled majors, and (optionally) the one yellow hand: the reading. Crisp by
 * definition; the pen never draws instruments. */
export function TickRuler({
  min,
  max,
  majors,
  reading,
  className,
}: {
  min: number;
  max: number;
  majors: { at: number; label: string }[];
  reading?: { at: number; label?: string };
  className?: string;
}) {
  const minors = Array.from({ length: 11 }, (_, i) => PAD + (i * (W - 2 * PAD)) / 10);
  return (
    <span className={clsx("block", className)}>
      <svg viewBox={`0 0 ${W} 32`} className="block h-8 w-full" fill="none" aria-hidden="true">
        <path d={`M${PAD} ${BASE} H ${W - PAD}`} stroke="var(--line)" strokeWidth="1" />
        <g stroke="var(--faint)" strokeWidth="1">
          {minors.map((mx) => (
            <line key={mx} x1={mx} y1={BASE} x2={mx} y2={BASE - 4} />
          ))}
          {majors.map((m) => (
            <line key={`M${m.at}`} x1={x(m.at, min, max)} y1={BASE} x2={x(m.at, min, max)} y2={BASE - 8} />
          ))}
        </g>
        {majors.map((m) => (
          <text key={`L${m.at}`} x={x(m.at, min, max)} y={BASE + 11} fontSize="8" textAnchor="middle" fill="var(--faint)">
            {m.label}
          </text>
        ))}
        {reading && (
          <g className="text-hand">
            <line x1={x(reading.at, min, max)} y1={BASE} x2={x(reading.at, min, max)} y2={4} stroke="currentColor" strokeWidth="2" />
            <circle cx={x(reading.at, min, max)} cy={4} r="2.2" fill="currentColor" stroke="none" />
          </g>
        )}
      </svg>
      {reading?.label && <span className="sr-only">{reading.label}</span>}
    </span>
  );
}

/** A single value on its scale, value written out beside the pointer —
 * hand yellow marks it, text carries it. */
export function Gauge({
  min,
  max,
  value,
  unit,
  className,
}: {
  min: number;
  max: number;
  value: number;
  unit: string;
  className?: string;
}) {
  return (
    <span className={clsx("block", className)}>
      <TickRuler min={min} max={max} majors={[{ at: min, label: String(min) }, { at: max, label: String(max) }]} reading={{ at: value }} />
      <span className="mt-1 block text-sm text-ink">
        <b className="font-mono">{value}</b> {unit}
      </span>
    </span>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run app/_components/instrument.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/_components/instrument.tsx app/_components/instrument.test.tsx
git commit -m "feat(redesign): instrument kit — crisp tick ruler and gauge with the one yellow hand"
```

---

### Task 6: The masthead

**Files:**
- Modify: `app/_components/site-header.tsx` (`HeaderFancy` only — `HeaderFunctional` and `HeaderMinimal` are untouched until Plan 5)
- Modify: `app/_components/site-header.test.tsx`

**Interfaces:**
- Consumes: `PenRule` from Task 4.
- Produces: the fancy masthead markup Plans 2–3 assume: a `<header>` containing a lowercase `goose index` wordmark link, the text nav, and a `PenRule` beneath. `NAV` array is unchanged (labels get lowercased in rendering, not in data — other components read `NAV`).

- [ ] **Step 1: Update the header test first**

In `app/_components/site-header.test.tsx`, find the fancy-header assertions (they reference the `Feather` icon circle, `font-display`, "Goose" / italic "Index"). Replace with expectations for the new masthead (keep the functional/minimal cases untouched):

```tsx
it("fancy masthead: lowercase wordmark, text nav, pen rule, no cards", () => {
  const html = renderToStaticMarkup(<HeaderFancy experience="fancy" />);
  expect(html).toContain("goose index");
  for (const label of ["shows", "songs", "stats", "on this day", "venues", "tours", "blog"]) {
    expect(html.toLowerCase()).toContain(label);
  }
  expect(html).toContain("text-pencil"); // the pen rule under the masthead
  expect(html).not.toContain("rounded-full"); // the feather badge is gone
  expect(html).not.toContain("backdrop-blur");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run app/_components/site-header.test.tsx`
Expected: FAIL — old markup.

- [ ] **Step 3: Rewrite `HeaderFancy`**

```tsx
export function HeaderFancy({ experience }: { experience: Experience }) {
  return (
    // --header-h mirrors the Container's h-14 — MobileNav offsets its sheet from it.
    <header className="sticky top-0 z-40 bg-paper [--header-h:3.5rem]">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 text-[0.95rem] font-semibold lowercase tracking-tight text-ink hover:text-steel">
          goose index
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-3 text-[0.85rem] lowercase text-muted md:flex lg:gap-5">
          {NAV.map((n) => (
            <NavLink
              key={n.href}
              href={n.href}
              className="whitespace-nowrap py-1 underline-offset-4 transition"
              activeClassName="text-steel underline"
              inactiveClassName="hover:text-ink hover:underline"
            >
              {n.label.toLowerCase()}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <SearchBox />
          <SettingsMenu current={experience} />
          <MobileNav />
        </div>
      </Container>
      <Container>
        <PenRule seed="masthead" />
      </Container>
    </header>
  );
}
```

Add `import { PenRule } from "./pen";` and remove the now-unused `Feather` import.

- [ ] **Step 4: Run header tests, then the full suite**

Run: `npx vitest run app/_components/site-header.test.tsx && npm test`
Expected: PASS (page-level tests asserting the old wordmark text "Goose Index" in the fancy header may need the lowercase update).

- [ ] **Step 5: Commit**

```bash
git add app/_components/site-header.tsx app/_components/site-header.test.tsx
git commit -m "feat(redesign): the masthead — lowercase wordmark, text nav, pen rule"
```

---

### Task 7: Checkpoint — the foundation holds

**Files:** none created; verification only.

- [ ] **Step 1: Full gate**

Run: `npm run typecheck && npm test && npm run build`
Expected: all PASS. `next build` catches server-component issues the unit suite can't.

- [ ] **Step 2: Visual smoke, both temperatures**

Run `npx next dev -p 3100`. In a browser: load `/`, `/shows`, `/stats`, one show page.
- Fog and slate both render (flip the OS appearance or pin via the settings gear).
- System font everywhere (no serif headings, no webfont flash in the network tab).
- No rounded cards, no hover lift, cool palette throughout (bridge working).
- The masthead reads `goose index` with the pen rule; settings offers auto/fog/slate.
- The pinned theme survives a reload; auto follows the OS.
Stop the server.

- [ ] **Step 3: Commit any straggler fixes and mark the plan done**

```bash
git add -A && git commit -m "chore(redesign): plan 1 checkpoint — foundation & chrome green" --allow-empty
```

---

## Self-review (author's, already applied)

- **Spec coverage:** Plan 1 delivers spec sections "Color and type" (tokens, system font, motion budget), the theme/edition machinery half of "Editions and themes", and the two kits from "The vocabulary". Everything else is explicitly deferred to Plans 2–5 in the roadmap — no silent gaps.
- **Placeholders:** none; every code step carries complete code.
- **Type consistency:** `Theme`/`THEME_VALUES`/`PINNED_THEMES`/`resolveTheme`/`themeScript` names match across Tasks 2–3; `PenRule`/`penRandom`/`TickRuler`/`Gauge` signatures match their tests and the Interfaces blocks.

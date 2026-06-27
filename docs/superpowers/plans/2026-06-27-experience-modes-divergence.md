# Experience-Mode Divergent Layouts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the three experience modes feel genuinely different by diverging layout, color, and chrome — not just fonts: Fancy stays the editorial showcase, Functional becomes a flat steel "tool," Minimal becomes a near browser-default document.

**Architecture:** Continue the presentation-layer pattern. Mode is already resolved server-side (`getExperience()`) and set as `data-experience` on `<html>`. This plan adds per-mode branches to the chrome (`SiteHeader`, `SiteFooter`) and a new per-mode `ShowHeader`, plus a steel palette + default-link CSS for the two non-Fancy modes, and makes the Functional setlist filterable.

**Tech Stack:** Next.js 15 (App Router, server + client components), Tailwind v4 (CSS-var tokens), Vitest + `react-dom/server` render tests.

## Global Constraints

- Mode values are exactly `fancy | functional | minimal`; resolved by `getExperience()` (server) from cookie `ga_experience`; default `fancy`. `lib/experience.ts` exports `type Experience` and `allowsTheme(e)` (false only for minimal).
- The setlist already varies per mode (`app/_components/setlist/`). Light/dark (`data-theme`) stays orthogonal and is hidden in Minimal.
- Tailwind tokens are CSS variables in `app/globals.css`; pivot via `[data-experience]` var overrides, never hardcoded hex in components. The accent token family is `--gold` / `--gold-soft` / `--gold-deep` (used for eyebrows, hovers, links, jam flames).
- Existing component patterns: `Container` wrapper, `clsx` from `./clsx`, Tailwind utility classes, `Link` from `next/link`. `SiteHeader` is an async server component reading `getExperience()`.
- `npm test`, `npm run typecheck`, `npm run build` must all pass. Never run `npm run build` while `npm run dev` runs.

---

### Task 1: Functional steel palette + Minimal default links (globals.css)

**Files:** Modify `app/globals.css` (the experience section near the end).

CSS only — verified by the compiled output + a later visual pass, not a unit test.

- [ ] **Step 1: Add the overrides**

In the Functional block (`:root[data-experience="functional"]`, currently sets `--type-*`), add the steel accent override after the `--type-mono` line:

```css
  --gold: #6ba3b8;
  --gold-soft: #4f8da3;
  --gold-deep: #3c7387;
```

After the Minimal block (`:root[data-experience="minimal"] { … }`), add a default-link rule so Minimal reads like a plain browser document:

```css
[data-experience="minimal"] a {
  color: #1a4fa0;
  text-decoration: underline;
  text-underline-offset: 2px;
}
```

- [ ] **Step 2: Build + verify the compiled CSS**

Run: `npm run build` (no dev server running). Then:
`CSS=$(ls -t .next/static/css/*.css | head -1); grep -o '\[data-experience=functional\]{[^}]*--gold:[^;]*' "$CSS" | head -1`
Expected: shows `--gold:#6ba3b8` inside the functional rule.
`grep -c 'data-experience=minimal\] a{color:#1a4fa0' "$CSS"` → `1`.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: functional steel accent + minimal default-link styling"
```

---

### Task 2: Per-mode SiteHeader

**Files:**
- Modify: `app/_components/site-header.tsx`
- Test: `app/_components/site-header.test.tsx`

**Interfaces:**
- Consumes: `getExperience()`; `ExperienceSwitcher`, `SearchBox`, `ThemeToggle`, `MobileNav`, `Feather`, `Container`, `allowsTheme`.
- Produces: `SiteHeader` (async) renders branded (fancy), slim flat (functional), or plain text (minimal) chrome.

`SiteHeader` reads cookies, so the test renders the three presentational bodies directly. Split the per-mode markup into named, prop-driven functions so they're testable without a request scope.

- [ ] **Step 1: Write the failing test**

Create `app/_components/site-header.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HeaderFancy, HeaderFunctional, HeaderMinimal } from "./site-header";

describe("SiteHeader variants", () => {
  it("fancy has the feather logo mark and is sticky", () => {
    const html = renderToStaticMarkup(<HeaderFancy experience="fancy" />);
    expect(html).toContain("<svg");
    expect(html).toContain("sticky");
  });
  it("functional is slim and mono, no rounded logo mark", () => {
    const html = renderToStaticMarkup(<HeaderFunctional experience="functional" />);
    expect(html).toContain("font-mono");
    expect(html).not.toContain("h-16");
  });
  it("minimal is a plain text nav: no svg, not sticky, underlined links", () => {
    const html = renderToStaticMarkup(<HeaderMinimal experience="minimal" />);
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("sticky");
    expect(html).toContain("underline");
    expect(html).toContain("Shows");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/_components/site-header.test.tsx`
Expected: FAIL — `HeaderFancy`/`HeaderFunctional`/`HeaderMinimal` not exported.

- [ ] **Step 3: Implement the variants + selector**

Replace `app/_components/site-header.tsx` with:

```tsx
import Link from "next/link";
import { Container } from "./container";
import { SearchBox } from "./search-box";
import { ThemeToggle } from "./theme-toggle";
import { MobileNav } from "./mobile-nav";
import { ExperienceSwitcher } from "./experience-switcher";
import { Feather } from "./marks";
import { getExperience } from "@/lib/experience.server";
import { allowsTheme, type Experience } from "@/lib/experience";

const NAV = [
  { href: "/shows", label: "Shows" },
  { href: "/on-this-day", label: "On This Day" },
  { href: "/venues", label: "Venues" },
  { href: "/tours", label: "Tours" },
];

export function HeaderFancy({ experience }: { experience: Experience }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-line text-gold transition group-hover:border-gold group-hover:rotate-[8deg]">
            <Feather className="h-[18px] w-[18px]" />
          </span>
          <span className="font-display text-[1.15rem] leading-none tracking-tight">
            Goose <span className="italic text-gold">Almanac</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-[0.9rem] text-muted md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="relative py-1 transition hover:text-ink">
              {n.label}
            </Link>
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

export function HeaderFunctional({ experience }: { experience: Experience }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <Container className="flex h-12 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-mono text-sm font-medium text-ink">
          <span className="text-gold">▤</span> Goose Almanac
        </Link>
        <nav className="hidden items-center gap-5 font-mono text-xs text-muted md:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="py-1 transition hover:text-gold">
              {n.label}
            </Link>
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

export function HeaderMinimal({ experience }: { experience: Experience }) {
  return (
    <header className="border-b border-line">
      <Container className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
        <Link href="/" className="font-medium underline">Goose Almanac</Link>
        <span className="text-faint" aria-hidden>·</span>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="underline">{n.label}</Link>
        ))}
        <Link href="/search" className="underline">Search</Link>
        <span className="ml-auto"><ExperienceSwitcher current={experience} /></span>
      </Container>
    </header>
  );
}

export async function SiteHeader() {
  const experience = await getExperience();
  if (experience === "minimal") return <HeaderMinimal experience={experience} />;
  if (experience === "functional") return <HeaderFunctional experience={experience} />;
  return <HeaderFancy experience={experience} />;
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run app/_components/site-header.test.tsx && npm run typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add app/_components/site-header.tsx app/_components/site-header.test.tsx
git commit -m "feat: per-mode site header (fancy branded / functional slim / minimal text)"
```

---

### Task 3: Per-mode SiteFooter

**Files:**
- Modify: `app/_components/site-footer.tsx`
- Test: `app/_components/site-footer.test.tsx`

**Interfaces:**
- Consumes: `getExperience()`, `Container`, `Feather`.
- Produces: `FooterFancy`, `FooterFunctional`, `FooterMinimal` (prop-free), and async `SiteFooter` selector. `new Date().getFullYear()` is fine in a server component.

- [ ] **Step 1: Write the failing test**

Create `app/_components/site-footer.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FooterMinimal, FooterFunctional, FooterFancy } from "./site-footer";

describe("SiteFooter variants", () => {
  it("minimal is one plain line with the elgoose credit and no logo", () => {
    const html = renderToStaticMarkup(<FooterMinimal />);
    expect(html).not.toContain("<svg");
    expect(html).toContain("elgoose.net");
    expect(html).not.toContain("Browse");
  });
  it("fancy keeps the multi-column footer with Browse", () => {
    const html = renderToStaticMarkup(<FooterFancy />);
    expect(html).toContain("Browse");
    expect(html).toContain("<svg");
  });
  it("functional is a single slim mono row", () => {
    const html = renderToStaticMarkup(<FooterFunctional />);
    expect(html).toContain("font-mono");
    expect(html).not.toContain("Browse");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/_components/site-footer.test.tsx`
Expected: FAIL — variants not exported.

- [ ] **Step 3: Implement**

Replace `app/_components/site-footer.tsx` with:

```tsx
import Link from "next/link";
import { Container } from "./container";
import { Feather } from "./marks";
import { getExperience } from "@/lib/experience.server";

export function FooterFancy() {
  return (
    <footer className="mt-28 border-t border-line">
      <Container className="grid gap-10 py-12 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-gold">
            <Feather className="h-5 w-5" />
            <span className="font-display text-lg text-ink">
              Goose <span className="italic text-gold">Almanac</span>
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            An almanac of every Goose show — setlists, segues, jams, venues, and the story of
            each night.
          </p>
        </div>
        <nav className="flex flex-col gap-2 text-sm text-muted">
          <span className="eyebrow mb-1">Browse</span>
          <Link href="/shows" className="transition hover:text-ink">All shows</Link>
          <Link href="/on-this-day" className="transition hover:text-ink">On this day</Link>
          <Link href="/venues" className="transition hover:text-ink">Venues</Link>
          <Link href="/tours" className="transition hover:text-ink">Tours</Link>
        </nav>
        <div className="flex flex-col gap-2 text-sm text-muted">
          <span className="eyebrow mb-1">Source</span>
          <p className="leading-relaxed">
            Setlist data courtesy of{" "}
            <a href="https://elgoose.net" className="link" target="_blank" rel="noreferrer">
              elgoose.net
            </a>
            . A non-commercial fan project.
          </p>
        </div>
      </Container>
      <div className="border-t border-line-soft">
        <Container className="flex flex-col items-center justify-between gap-2 py-5 text-xs text-faint sm:flex-row">
          <span className="font-mono">© {new Date().getFullYear()} Goose Almanac</span>
          <span className="font-mono">Not affiliated with Goose. Built by fans.</span>
        </Container>
      </div>
    </footer>
  );
}

export function FooterFunctional() {
  return (
    <footer className="mt-16 border-t border-line">
      <Container className="flex flex-col items-center justify-between gap-2 py-5 font-mono text-xs text-faint sm:flex-row">
        <span>© {new Date().getFullYear()} Goose Almanac · data from elgoose.net</span>
        <span>Not affiliated with Goose. Built by fans.</span>
      </Container>
    </footer>
  );
}

export function FooterMinimal() {
  return (
    <footer className="mt-16 border-t border-line">
      <Container className="py-6 text-sm text-muted">
        Goose Almanac — setlist data from{" "}
        <a href="https://elgoose.net" target="_blank" rel="noreferrer">elgoose.net</a>. A
        non-commercial fan project, not affiliated with Goose.
      </Container>
    </footer>
  );
}

export async function SiteFooter() {
  const experience = await getExperience();
  if (experience === "minimal") return <FooterMinimal />;
  if (experience === "functional") return <FooterFunctional />;
  return <FooterFancy />;
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run app/_components/site-footer.test.tsx && npm run typecheck`
Expected: PASS + clean.

- [ ] **Step 5: Commit**

```bash
git add app/_components/site-footer.tsx app/_components/site-footer.test.tsx
git commit -m "feat: per-mode site footer (fancy / functional slim / minimal one-line)"
```

---

### Task 4: Per-mode ShowHeader

**Files:**
- Create: `app/_components/show-header.tsx`
- Create: `app/_components/show-header.test.tsx`
- Modify: `app/shows/[date]/page.tsx`

**Interfaces:**
- Consumes: `ShowDetail`, `SetlistEntry` types; `dateParts`, `locationLine`, `formatDuration`, `trackSeconds` from format; `type Experience`; `MapPin`, `ArrowLeft` marks; `Link`, `Container`.
- Produces: `ShowHeader({ show, date, setlist, experience }: { show: ShowDetail; date: string; setlist: SetlistEntry[]; experience: Experience })`. It computes its own stats and renders the fancy hero, the functional compact header, or the minimal document head.

- [ ] **Step 1: Write the failing test**

Create `app/_components/show-header.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShowHeader } from "./show-header";
import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";

const show: ShowDetail = {
  showId: 1, date: "2026-06-26", order: null, venue: "Red Hat Amphitheater",
  city: "Raleigh", state: "NC", country: "USA", tour: "Summer Tour 2026", tourId: 7,
  songCount: 2, hasNotes: false, venueId: 9, permalink: null, notes: null,
};
const setlist = [
  { setType: "Set", setNumber: "1", trackTime: "9:00" },
  { setType: "Set", setNumber: "1", trackTime: "8:00" },
] as SetlistEntry[];

describe("ShowHeader", () => {
  it("minimal renders a breadcrumb, an h1, and a facts dl — no hero glow", () => {
    const html = renderToStaticMarkup(<ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="minimal" />);
    expect(html).toContain("<h1");
    expect(html).toContain("<dl");
    expect(html).toContain("Red Hat Amphitheater");
    expect(html).not.toContain("stage-glow");
  });
  it("functional renders compact stat chips, no big hero", () => {
    const html = renderToStaticMarkup(<ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="functional" />);
    expect(html).toContain("2026-06-26");
    expect(html).not.toContain("stage-glow");
  });
  it("fancy renders the hero with the stage glow and eyebrow", () => {
    const html = renderToStaticMarkup(<ShowHeader show={show} date="2026-06-26" setlist={setlist} experience="fancy" />);
    expect(html).toContain("stage-glow");
    expect(html).toContain("eyebrow");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/_components/show-header.test.tsx`
Expected: FAIL — `Cannot find module './show-header'`.

- [ ] **Step 3: Create the component**

Create `app/_components/show-header.tsx`. Compute stats once, then branch. The **fancy** branch is the existing hero JSX — move it verbatim from `app/shows/[date]/page.tsx` (the `<header className="relative overflow-hidden border-b border-line">…</header>` block), with these substitutions: it already uses `dp`, `loc`, `show`, `setlist`, `setCount`, `encores`, `known`, `totalSecs` — all computed below. Provide the functional and minimal branches in full:

```tsx
import Link from "next/link";
import { Container } from "./container";
import { MapPin } from "./marks";
import { dateParts, locationLine, formatDuration, trackSeconds } from "@/lib/queries/format";
import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";
import type { Experience } from "@/lib/experience";

function useStats(date: string, setlist: SetlistEntry[]) {
  const dp = dateParts(date);
  const setNumbers = new Set(
    setlist.map((e) => (e.setNumber ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const encores = [...setNumbers].filter((s) => s.startsWith("e")).length;
  const setCount = Math.max(setNumbers.size - encores, setNumbers.size === 0 ? 0 : 1);
  const totalSecs = setlist.reduce((acc, e) => acc + (trackSeconds(e.trackTime) ?? 0), 0);
  const known = setlist.filter((e) => trackSeconds(e.trackTime) != null).length;
  return { dp, encores, setCount, totalSecs, known };
}

export function ShowHeader({
  show, date, setlist, experience,
}: { show: ShowDetail; date: string; setlist: SetlistEntry[]; experience: Experience }) {
  const { dp, encores, setCount, totalSecs, known } = useStats(date, setlist);
  const loc = locationLine(show.city, show.state, show.country);
  const durationLogged = known >= setlist.length / 2 && totalSecs > 0 ? formatDuration(totalSecs) : null;

  if (experience === "minimal") {
    return (
      <Container size="prose" className="pt-8">
        <nav className="mb-5 text-sm text-muted">
          <Link href="/">Goose Almanac</Link> / <Link href="/shows">Shows</Link> / {date}
        </nav>
        <h1 className="text-2xl font-medium text-ink">
          {dp.month} {dp.day}, {dp.year} — {show.venue ?? "Unknown venue"}
        </h1>
        <dl className="mt-3 text-[0.95rem] leading-7 text-ink">
          {loc && <div><span className="text-muted">Location:</span> {loc}</div>}
          {show.tour && <div><span className="text-muted">Tour:</span> {show.tour}</div>}
          <div>
            <span className="text-muted">Songs:</span> {setlist.length} · {setCount} {setCount === 1 ? "set" : "sets"}
            {encores > 0 ? ` + ${encores} encore${encores === 1 ? "" : "s"}` : ""}
            {durationLogged ? ` · ${durationLogged}` : ""}
          </div>
          {show.permalink && (
            <div>
              <span className="text-muted">Source:</span>{" "}
              <a href={`https://elgoose.net/setlists/${show.permalink}`} target="_blank" rel="noreferrer">elgoose.net</a>
            </div>
          )}
        </dl>
      </Container>
    );
  }

  if (experience === "functional") {
    return (
      <div className="border-b border-line">
        <Container className="py-5">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
            <div>
              <div className="font-mono text-sm font-medium text-ink">
                {date} · {show.venueId ? <Link href={`/venues/${show.venueId}`} className="text-gold hover:underline">{show.venue}</Link> : (show.venue ?? "Unknown venue")}
              </div>
              <div className="font-mono text-xs text-muted">
                {loc || "—"}{show.tour ? ` · ${show.tour}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-1.5 font-mono text-[0.7rem] text-faint">
              <span className="rounded border border-line px-2 py-0.5">{setlist.length} songs</span>
              <span className="rounded border border-line px-2 py-0.5">{setCount} {setCount === 1 ? "set" : "sets"}</span>
              {encores > 0 && <span className="rounded border border-line px-2 py-0.5">{encores} enc</span>}
              {durationLogged && <span className="rounded border border-line px-2 py-0.5">{durationLogged}</span>}
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <header className="relative overflow-hidden border-b border-line">
      <div className="stage-glow inset-x-0 top-0 h-72" />
      <Container className="relative py-12 sm:py-16">
        <span className="eyebrow">
          {show.tourId && show.tour ? (
            <Link href={`/tours/${show.tourId}`} className="transition hover:text-gold">{show.tour}</Link>
          ) : ("Goose")}
          {"  ·  "}
          {dp.weekday}
        </span>
        <h1 className="rise mt-3 font-display text-[2.6rem] leading-none tracking-tight text-ink sm:text-5xl">
          {dp.month} {dp.day}, {dp.year}
        </h1>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-xl">
          <span className="text-muted">at</span>
          {show.venueId ? (
            <Link href={`/venues/${show.venueId}`} className="font-display text-2xl text-gold underline decoration-gold/30 underline-offset-4 transition hover:decoration-gold">{show.venue}</Link>
          ) : (
            <span className="font-display text-2xl text-ink">{show.venue ?? "Unknown venue"}</span>
          )}
        </p>
        {loc && (
          <span className="mt-2 flex items-center gap-1.5 text-muted">
            <MapPin className="h-4 w-4 text-faint" /> {loc}
          </span>
        )}
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-faint">
          <span><span className="text-ink">{setlist.length}</span> songs</span>
          <span className="text-line">·</span>
          <span><span className="text-ink">{setCount}</span> {setCount === 1 ? "set" : "sets"}</span>
          {encores > 0 && (<><span className="text-line">·</span><span><span className="text-ink">{encores}</span> {encores === 1 ? "encore" : "encores"}</span></>)}
          {durationLogged && (<><span className="text-line">·</span><span><span className="text-ink">{durationLogged}</span> logged</span></>)}
          {show.permalink && (<><span className="text-line">·</span><a href={`https://elgoose.net/setlists/${show.permalink}`} target="_blank" rel="noreferrer" className="text-sage transition hover:text-ink">View on elgoose ↗</a></>)}
        </div>
      </Container>
    </header>
  );
}
```

(The fancy branch reproduces the page's current hero minus the "Also this day" siblings block, which stays in the page below the header.)

- [ ] **Step 4: Wire it into the show page**

In `app/shows/[date]/page.tsx`:
- Add import: `import { ShowHeader } from "@/app/_components/show-header";`
- Replace the entire `{/* Header */}` `<header …>…</header>` block (the hero) with:
  ```tsx
  <ShowHeader show={show} date={date} setlist={setlist} experience={experience} />
  ```
- Wrap the existing `{/* Top bar */}` block so it is hidden in Minimal: change its outer `<div className="border-b border-line">` opening to `{experience !== "minimal" && (` … `)}` around the whole top-bar `<div>…</div>`.
- Leave the "Also this day" siblings block, the body (`notes` + `<Setlist>`), and prev/next nav as they are.
- The page already computes `setCount`, `encores`, `totalSecs`, `known` for the old header; once the header is a component these locals become unused — delete the now-dead `setNumbers`/`encores`/`setCount`/`totalSecs`/`known` lines from the page to avoid unused-variable noise. (`dp` and `loc` are still used by the siblings/body — keep them.)

- [ ] **Step 5: Run test + typecheck + full suite**

Run: `npx vitest run app/_components/show-header.test.tsx && npm run typecheck && npm test`
Expected: PASS, clean, all green.

- [ ] **Step 6: Commit**

```bash
git add app/_components/show-header.tsx app/_components/show-header.test.tsx app/shows/[date]/page.tsx
git commit -m "feat: per-mode show header (fancy hero / functional compact / minimal document)"
```

---

### Task 5: Functional setlist toolbar (client filter / sort / jams)

**Files:**
- Modify: `app/_components/setlist/functional.tsx` (make it a client component with controls)
- Modify: `app/_components/setlist/functional.test.tsx` (keep the render assertions valid)

**Interfaces:**
- `SetlistFunctional({ entries }: { entries: SetlistEntry[] })` becomes a client component (`"use client"`) with a search box, a sort select (Set order / Longest / A–Z), and a "jams only" checkbox that filter/sort the rendered rows. The grouped table still renders; controls operate on a flattened, filtered view. Initial render (no input) shows every row, so the existing test stays valid.

- [ ] **Step 1: Extend the test**

Add to `app/_components/setlist/functional.test.tsx` a case asserting the controls render and the initial (unfiltered) table shows all songs:

```tsx
it("renders filter controls and all rows initially", () => {
  const html = renderToStaticMarkup(
    <SetlistFunctional entries={[entry({ song: "Tumble" }), entry({ song: "Yeti", position: 2 })]} />,
  );
  expect(html).toContain("Filter songs");
  expect(html).toContain("Tumble");
  expect(html).toContain("Yeti");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run app/_components/setlist/functional.test.tsx`
Expected: FAIL — "Filter songs" not present.

- [ ] **Step 3: Implement the client toolbar**

Replace `app/_components/setlist/functional.tsx` with:

```tsx
"use client";

import { useMemo, useState } from "react";
import { Flame } from "../marks";
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
    let flat = groups.flatMap((g) =>
      g.entries.map((e, i) => ({ e, set: i === 0 ? g.label : "", n: i + 1 })),
    );
    if (q.trim()) flat = flat.filter((r) => r.e.song.toLowerCase().includes(q.trim().toLowerCase()));
    if (jamsOnly) flat = flat.filter((r) => r.e.isJamchart);
    if (sort === "az") flat = [...flat].sort((a, b) => a.e.song.localeCompare(b.e.song));
    if (sort === "long")
      flat = [...flat].sort((a, b) => (trackSeconds(b.e.trackTime) ?? 0) - (trackSeconds(a.e.trackTime) ?? 0));
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
          placeholder="Filter songs"
          aria-label="Filter songs"
          className="h-8 min-w-[8rem] flex-1 rounded border border-line bg-surface px-2 font-mono text-sm text-ink outline-none focus:border-gold"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          aria-label="Sort"
          className="h-8 rounded border border-line bg-surface px-2 font-mono text-sm text-muted"
        >
          <option value="set">Set order</option>
          <option value="long">Longest</option>
          <option value="az">A–Z</option>
        </select>
        <label className="flex items-center gap-1.5 font-mono text-xs text-muted">
          <input type="checkbox" checked={jamsOnly} onChange={(e) => setJamsOnly(e.target.checked)} /> jams
        </label>
      </div>
      <table className="w-full border-collapse font-mono text-sm">
        <thead>
          <tr className="border-b border-line text-left text-[0.66rem] uppercase tracking-wider text-faint">
            <th className="py-2 pr-3 font-normal">Set</th>
            <th className="py-2 pr-3 font-normal">#</th>
            <th className="w-full py-2 pr-3 font-normal">Song</th>
            <th className="py-2 pr-3 font-normal" aria-label="Segue">→</th>
            <th className="py-2 pr-3 text-right font-normal">Time</th>
            <th className="py-2 font-normal">Jam</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.e.uniqueId} className="border-b border-line-soft align-baseline">
              <td className="py-1.5 pr-3 text-faint">{r.set}</td>
              <td className="py-1.5 pr-3 tabular-nums text-faint">{r.n}</td>
              <td className="py-1.5 pr-3 text-ink">{r.e.song}</td>
              <td className="py-1.5 pr-3 text-gold">{isSegue(r.e.transition) ? "›" : ""}</td>
              <td className="py-1.5 pr-3 text-right tabular-nums text-muted">{r.e.trackTime ?? "—"}</td>
              <td className="py-1.5">
                {r.e.isJamchart ? <Flame className="inline h-3.5 w-3.5 text-gold" strokeWidth={1.7} /> : <span className="text-faint">·</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run app/_components/setlist/functional.test.tsx && npm run typecheck`
Expected: PASS (initial render shows all rows + the controls) + clean.

- [ ] **Step 5: Commit**

```bash
git add app/_components/setlist/functional.tsx app/_components/setlist/functional.test.tsx
git commit -m "feat: functional setlist toolbar — client filter, sort, jams-only"
```

---

### Task 6: Verify + ship

**Files:** Modify `docs/superpowers/specs/2026-06-27-experience-modes-divergence.md` (status).

- [ ] **Step 1: Full gate**

Stop any dev server. Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: all pass; build succeeds.

- [ ] **Step 2: Confirm the per-mode CSS compiled**

```bash
CSS=$(ls -t .next/static/css/*.css | head -1)
grep -c 'data-experience=functional\]{[^}]*--gold:#6ba3b8' "$CSS"   # 1
grep -c 'data-experience=minimal\] a{color:#1a4fa0' "$CSS"          # 1
```

- [ ] **Step 3: Mark spec built + commit**

In the spec, change `Status: proposed` → `Status: built 2026-06-27`.
```bash
git add docs/superpowers/specs/2026-06-27-experience-modes-divergence.md
git commit -m "docs: mark divergent-layouts spec built"
```

- [ ] **Step 4: (controller) merge to main, deploy, live-verify all three modes** — handled by the finishing-a-development-branch flow; verify on production that minimal renders the breadcrumb/dl document, functional shows steel + compact header + toolbar, fancy is unchanged.

---

## Self-Review

**Spec coverage:** Minimal bare document → Tasks 2 (text header), 3 (one-line footer), 4 (breadcrumb/h1/dl show header), 1 (default links). Functional steel/flat tool → Tasks 1 (steel), 2 (slim header), 4 (compact header), 5 (toolbar). Per-mode chrome → Tasks 2, 3. Fancy unchanged → variants preserve current markup. ✓

**Placeholder scan:** No TBD/TODO; new components have full code; the one verbatim move (fancy hero in Task 4) names the exact source block and lists the locals it uses. Commands have expected output.

**Type consistency:** `Experience`, `getExperience`, `allowsTheme`, `ShowHeader({show,date,setlist,experience})`, `ShowDetail`/`SetlistEntry`, `HeaderFancy/Functional/Minimal`, `FooterFancy/Functional/Minimal`, `SetlistFunctional({entries})` are defined once and consumed consistently. `SetlistFunctional` gains `"use client"` but its prop shape and the setlist selector that renders it are unchanged.

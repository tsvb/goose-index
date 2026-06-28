# "Listen / Watch on nugs" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tasteful "Listen / Watch on nugs" handoff to the Goose Almanac — a show-header action that plays the whole show, plus a per-track hover-reveal ▷ in the setlist — emitting the `applenugs://` deep-link scheme with a web fallback, across all three experience modes.

**Architecture:** Pure URL builders in `lib/nugs.ts`; one small client component `NugsLink` (`app/_components/nugs-link.tsx`) that renders an `applenugs://` anchor and falls back to the nugs.net web on a timeout. Each experience branch of `ShowHeader` and each setlist variant renders bespoke per-mode markup that drops in `NugsLink`. CSS in `globals.css` handles the hover-reveal and per-mode styling.

**Tech Stack:** Next.js 15 App Router (server + one client component), Tailwind v4 CSS-var tokens, Vitest + `renderToStaticMarkup`.

## Global Constraints

- **Scheme/URLs (from the locked contract, `docs/integrations/applenugs-deeplink.md`):**
  - Show (plays whole show): `applenugs://show/<YYYY-MM-DD>?artist=Goose[&venue=<venue>][&media=audio|video]`
  - Track (new this feature): `applenugs://show/<YYYY-MM-DD>?artist=Goose&song=<title>&set=<n>&pos=<n>[&venue=][&media=]`
  - `media` omitted ⇒ audio (never emit `media=audio`).
- **Percent-encode query values with `%20` for spaces — do NOT use `URLSearchParams`** (it emits `+`, which Swift's `URLComponents` does not decode to a space). Use `encodeURIComponent`.
- **Artist is always `Goose`** (constant; the Almanac is Goose-only).
- **Per-track is hover-reveal where a pointer exists, always-visible on touch** (`@media (hover: hover)`). Fancy/Functional render a ▷ glyph; Minimal renders a plain "listen" text link.
- Both affordances are **secondary/unobtrusive** (not primary CTAs); they sit beside the existing "View on elgoose" affordance.
- **Web fallback kept:** `NugsLink` falls back to a nugs.net Goose search if the app doesn't open.
- The Almanac never checks nugs availability or subscription — the app owns that.
- Follow existing per-mode patterns (each `ShowHeader`/setlist branch is bespoke). DRY, YAGNI, TDD, frequent commits. Run `npm test` + `npm run typecheck` before declaring a task done. Never run `npm run build` while `npm run dev` is running.

---

## File Structure

**New**
- `lib/nugs.ts` — URL builders (`nugsShowHref`, `nugsTrackHref`, `nugsWebFallback`, `NUGS_SCHEME`).
- `lib/nugs.test.ts` — URL-builder unit tests.
- `app/_components/nugs-link.tsx` — `"use client"` `NugsLink` (anchor + timeout fallback).
- `app/_components/nugs-link.test.tsx` — render test.

**Modified**
- `docs/integrations/applenugs-deeplink.md` — add the track-level section + the `%20` encoding note.
- `app/globals.css` — `.nugs-*` styles (hover-reveal + per-mode look).
- `app/_components/show-header.tsx` — Listen/Watch in all three branches.
- `app/_components/setlist/index.tsx` — thread `showDate`/`venue` to variants.
- `app/_components/setlist/{fancy,functional,minimal}.tsx` — per-track ▷/"listen".
- `app/shows/[date]/page.tsx` — pass `showDate`/`venue` to `<Setlist>`.
- `app/_components/setlist/{fancy,functional,minimal}.test.tsx` — assert per-track href.

---

## Task 1: URL builders + contract-doc track extension

**Files:**
- Create: `lib/nugs.ts`, `lib/nugs.test.ts`
- Modify: `docs/integrations/applenugs-deeplink.md`

**Interfaces (Produces):**
- `const NUGS_SCHEME = "applenugs"`
- `type NugsMedia = "audio" | "video"`
- `nugsShowHref(o: { date: string; venue?: string | null; media?: NugsMedia }): string`
- `nugsTrackHref(o: { date: string; venue?: string | null; song: string; set?: string | null; pos?: number | null; media?: NugsMedia }): string`
- `nugsWebFallback(o: { date: string; venue?: string | null }): string`

- [ ] **Step 1: Write the failing tests**

Create `lib/nugs.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { nugsShowHref, nugsTrackHref, nugsWebFallback, NUGS_SCHEME } from "./nugs";

describe("nugs URL builders", () => {
  it("scheme constant", () => {
    expect(NUGS_SCHEME).toBe("applenugs");
  });
  it("show href: artist always Goose; venue %20-encoded; audio default omitted", () => {
    expect(nugsShowHref({ date: "2024-04-20" })).toBe("applenugs://show/2024-04-20?artist=Goose");
    expect(nugsShowHref({ date: "2024-04-20", venue: "The Salt Shed" }))
      .toBe("applenugs://show/2024-04-20?artist=Goose&venue=The%20Salt%20Shed");
    expect(nugsShowHref({ date: "2024-04-20", media: "audio" })).not.toContain("media=");
    expect(nugsShowHref({ date: "2024-04-20", media: "video" }))
      .toBe("applenugs://show/2024-04-20?artist=Goose&media=video");
  });
  it("track href: song/set/pos, %20-encoded, fixed key order", () => {
    expect(nugsTrackHref({ date: "2024-04-20", song: "Hot Tea", set: "1", pos: 2 }))
      .toBe("applenugs://show/2024-04-20?artist=Goose&song=Hot%20Tea&set=1&pos=2");
    expect(nugsTrackHref({ date: "2024-04-20", song: "Hot Tea", set: "1", pos: 2, venue: "The Cap", media: "video" }))
      .toBe("applenugs://show/2024-04-20?artist=Goose&song=Hot%20Tea&set=1&pos=2&venue=The%20Cap&media=video");
  });
  it("never emits + for spaces (Swift URLComponents safety)", () => {
    expect(nugsTrackHref({ date: "2024-04-20", song: "Hot Tea" })).not.toContain("+");
  });
  it("web fallback: a reliable nugs.net web landing", () => {
    expect(nugsWebFallback({ date: "2024-04-20" })).toBe("https://play.nugs.net/");
  });
});
```

- [ ] **Step 2: Run it, verify failure** — `npx vitest run lib/nugs.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement `lib/nugs.ts`**

```ts
export const NUGS_SCHEME = "applenugs";
const ARTIST = "Goose";

export type NugsMedia = "audio" | "video";

/** Build a query string with `%20` encoding (NOT URLSearchParams, which emits `+`
 *  — Swift's URLComponents does not decode `+` to a space). Fixed key order;
 *  empty/nullish values are dropped. */
function query(pairs: Array<[string, string | number | null | undefined]>): string {
  return pairs
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
}

export function nugsShowHref(o: { date: string; venue?: string | null; media?: NugsMedia }): string {
  const q = query([
    ["artist", ARTIST],
    ["venue", o.venue],
    ["media", o.media === "video" ? "video" : undefined],
  ]);
  return `${NUGS_SCHEME}://show/${o.date}?${q}`;
}

export function nugsTrackHref(o: {
  date: string; venue?: string | null; song: string;
  set?: string | null; pos?: number | null; media?: NugsMedia;
}): string {
  const q = query([
    ["artist", ARTIST],
    ["song", o.song],
    ["set", o.set],
    ["pos", o.pos],
    ["venue", o.venue],
    ["media", o.media === "video" ? "video" : undefined],
  ]);
  return `${NUGS_SCHEME}://show/${o.date}?${q}`;
}

/** Web fallback for users without the app: a reliable nugs.net web landing.
 *  Kept generic on purpose — `play.nugs.net` is a SPA and its date/artist search
 *  route isn't confirmed; a precise date-search URL can replace this body later
 *  without touching callers (the signature already carries date/venue). */
export function nugsWebFallback(_o: { date: string; venue?: string | null }): string {
  return "https://play.nugs.net/";
}
```

> The signature keeps `date`/`venue` (prefixed `_o` since unused now) so upgrading to a precise search URL later is a one-function change, no caller churn.

- [ ] **Step 4: Run tests, verify pass** — `npx vitest run lib/nugs.test.ts` → PASS.

- [ ] **Step 5: Extend the contract doc**

In `docs/integrations/applenugs-deeplink.md`, under "The URL scheme" add a track-level subsection and an encoding note. Append after the existing examples block:

```markdown
### Track-level (jump to one performance)

```
applenugs://show/<YYYY-MM-DD>?artist=Goose&song=<title>&set=<n>&pos=<n>[&venue=][&media=]
```

| Part | Notes |
|------|-------|
| `song` | The song **title** (percent-encoded), matched against the resolved container's nugs track titles. |
| `set` / `pos` | The setlist `setNumber` / `position` — disambiguate repeats/covers within the show. |

The app resolves the show (above), then finds the matching track and starts playback
there. Track-level links only *work* once the app adds track matching; the Almanac
emits them regardless.

### Encoding

Query values are **percent-encoded with `%20` for spaces** (e.g. `song=Hot%20Tea`).
Do not use `+` for spaces — Swift's `URLComponents.queryItems` does not decode `+` to a
space, so a `+` would reach the app literally.
```

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add lib/nugs.ts lib/nugs.test.ts docs/integrations/applenugs-deeplink.md
git commit -m "feat(nugs): URL builders (show/track/fallback) + track-level contract extension"
```

---

## Task 2: `NugsLink` client component + CSS

**Files:**
- Create: `app/_components/nugs-link.tsx`, `app/_components/nugs-link.test.tsx`
- Modify: `app/globals.css`

**Interfaces:**
- Consumes: nothing from Task 1 directly (callers build hrefs).
- Produces: `NugsLink({ href, fallback, className?, title?, children }: { href: string; fallback: string; className?: string; title?: string; children: React.ReactNode })`.
- CSS classes produced: `.nugs-row` (wrapper that enables hover-reveal), `.nugs-track` (the per-track affordance), `.nugs-show` (the show-header Listen/Watch link). Per-mode look via `[data-experience="..."]`.

- [ ] **Step 1: Write the failing render test**

Create `app/_components/nugs-link.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NugsLink } from "./nugs-link";

describe("NugsLink", () => {
  it("renders the applenugs href, carries the fallback, and children", () => {
    const html = renderToStaticMarkup(
      <NugsLink
        href="applenugs://show/2024-04-20?artist=Goose"
        fallback="https://play.nugs.net/#/search?q=Goose%202024-04-20"
        className="nugs-track"
        title="Listen on nugs"
      >▷</NugsLink>,
    );
    expect(html).toContain('href="applenugs://show/2024-04-20?artist=Goose"');
    expect(html).toContain('data-fallback="https://play.nugs.net/#/search?q=Goose%202024-04-20"');
    expect(html).toContain("nugs-track");
    expect(html).toContain("▷");
  });
});
```

- [ ] **Step 2: Run it, verify failure** — `npx vitest run app/_components/nugs-link.test.tsx` → FAIL.

- [ ] **Step 3: Implement `app/_components/nugs-link.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";

/**
 * Anchor to an `applenugs://` deep link. On click it lets the browser attempt the
 * scheme; if the app doesn't take focus shortly, it sends the user to the web
 * fallback. If the app opens, the page is backgrounded → the fallback is cancelled.
 * Progressive enhancement: with JS off, the anchor still attempts the scheme.
 */
export function NugsLink({
  href, fallback, className, title, children,
}: { href: string; fallback: string; className?: string; title?: string; children: ReactNode }) {
  function handleClick() {
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    window.addEventListener("blur", cancel, { once: true });
    document.addEventListener("visibilitychange", cancel, { once: true });
    window.setTimeout(() => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
      if (!cancelled && document.visibilityState === "visible") {
        window.location.href = fallback;
      }
    }, 1200);
  }
  return (
    <a href={href} title={title} className={className} data-fallback={fallback} onClick={handleClick}>
      {children}
    </a>
  );
}
```

- [ ] **Step 4: Run test, verify pass** — `npx vitest run app/_components/nugs-link.test.tsx` → PASS.

- [ ] **Step 5: Add CSS to `app/globals.css`** (append at end; base = Fancy, overrides per mode):

```css
/* ---- nugs "Listen / Watch" affordance ---- */
/* show-header link (Listen / Watch) — tasteful secondary */
.nugs-show {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 0.76rem; color: #8fc6ee; border: 1px solid #34506a; border-radius: 8px;
  padding: 4px 10px; background: linear-gradient(180deg, rgba(60,110,160,0.16), rgba(40,70,110,0.10));
  transition: border-color 0.15s, color 0.15s;
}
.nugs-show:hover { color: #bfe0fb; border-color: #4a78a6; text-decoration: none; }
.nugs-show.watch { color: #c6b8ee; border-color: #4a3f6a; background: linear-gradient(180deg, rgba(110,80,170,0.16), rgba(70,55,120,0.10)); }
.nugs-show.watch:hover { color: #ddd0fb; border-color: #6a5aa0; }

/* per-track ▷ — hover-reveal where a pointer exists, always-visible on touch */
.nugs-track {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 5px; border-radius: 6px;
  color: #7fbfe8; border: 1px solid #2f4860; font-size: 0.66rem; line-height: 1;
}
.nugs-track:hover { color: #bfe0fb; border-color: #4a78a6; text-decoration: none; }
@media (hover: hover) {
  .nugs-row .nugs-track { visibility: hidden; }
  .nugs-row:hover .nugs-track { visibility: visible; }
}

/* Functional (Web 2.0) reskin */
[data-experience="functional"] .nugs-show { color: #2c7cc4; border-color: #aebfce; background: linear-gradient(#ffffff, #eef5fb); }
[data-experience="functional"] .nugs-show.watch { color: #6a4ca8; border-color: #c3b6e0; background: linear-gradient(#ffffff, #f1ecfb); }
[data-experience="functional"] .nugs-track { color: #2c7cc4; border-color: #aebfce; background: linear-gradient(#ffffff, #eef5fb); }

/* Minimal (document) — plain underlined "listen" text link, no border/box */
[data-experience="minimal"] .nugs-show,
[data-experience="minimal"] .nugs-track {
  border: 0; background: none; padding: 0; min-width: 0; height: auto;
  color: #1a4fa0; text-decoration: underline; font-size: inherit; border-radius: 0;
}
```

- [ ] **Step 6: Typecheck + commit**

```bash
npm run typecheck
git add app/_components/nugs-link.tsx app/_components/nugs-link.test.tsx app/globals.css
git commit -m "feat(nugs): NugsLink client component (scheme + web fallback) + per-mode CSS"
```

---

## Task 3: Show-header Listen / Watch (all three modes)

**Files:**
- Modify: `app/_components/show-header.tsx`

**Interfaces:**
- Consumes: `nugsShowHref`, `nugsWebFallback` (Task 1); `NugsLink` (Task 2).
- `ShowHeader` already receives `show` (has `venue`) and `date`.

- [ ] **Step 1: Add imports** at the top of `app/_components/show-header.tsx`:

```tsx
import { NugsLink } from "./nugs-link";
import { nugsShowHref, nugsWebFallback } from "@/lib/nugs";
```

- [ ] **Step 2: Add a local `ShowNugs` helper** (one definition reused by all three branches), placed above the `ShowHeader` function in the same file:

```tsx
function ShowNugs({ date, venue, minimal = false }: { date: string; venue: string | null; minimal?: boolean }) {
  const fallback = nugsWebFallback({ date, venue });
  if (minimal) {
    return (
      <>
        <NugsLink href={nugsShowHref({ date, venue })} fallback={fallback} className="nugs-show">listen on nugs</NugsLink>
        {" · "}
        <NugsLink href={nugsShowHref({ date, venue, media: "video" })} fallback={fallback} className="nugs-show watch">watch</NugsLink>
      </>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <NugsLink href={nugsShowHref({ date, venue })} fallback={fallback} className="nugs-show" title="Play this show on nugs">▷ Listen on nugs</NugsLink>
      <NugsLink href={nugsShowHref({ date, venue, media: "video" })} fallback={fallback} className="nugs-show watch" title="Watch this show on nugs">▷ Watch</NugsLink>
    </span>
  );
}
```

- [ ] **Step 3: Wire each branch.**

**Minimal** — add a `Source`-style row to the `MetaTable` rows array (right after the existing `Source` row, inside the same `rows={[...]}`):
```tsx
{ k: "Listen", v: <ShowNugs date={date} venue={show.venue} minimal /> },
```

**Functional** — inside the `w2-panel` `<div>`, after the badges `<div className="mt-3 flex flex-wrap gap-1.5">…</div>`, add:
```tsx
<div className="mt-3"><ShowNugs date={date} venue={show.venue} /></div>
```

**Fancy** — in the mono stats row (`<div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 …">`), after the `elgoose` link block, add:
```tsx
<span className="text-line">·</span>
<ShowNugs date={date} venue={show.venue} />
```

- [ ] **Step 4: Verify build + render**

`npm run typecheck`. Then a render test — extend `app/_components/show-header.test.tsx` if it exists, else create it:

```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShowHeader } from "./show-header";
import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";

const show = { showId: 1, date: "2024-04-20", order: 1, venue: "The Salt Shed", city: "Chicago", state: "IL", country: "USA", tour: null, tourId: null, songCount: 2, hasNotes: false, venueId: 9, permalink: "p", notes: null } as ShowDetail;
const setlist: SetlistEntry[] = [];

describe("ShowHeader nugs affordance", () => {
  for (const exp of ["fancy", "functional", "minimal"] as const) {
    it(`emits a show-level applenugs Listen link in ${exp}`, () => {
      const html = renderToStaticMarkup(<ShowHeader show={show} date="2024-04-20" setlist={setlist} experience={exp} />);
      expect(html).toContain("applenugs://show/2024-04-20?artist=Goose&venue=The%20Salt%20Shed");
      expect(html).toContain("media=video"); // the Watch variant
    });
  }
});
```

Run: `npx vitest run app/_components/show-header.test.tsx` → PASS. (If `ShowDetail` requires fields not above, copy the shape from `lib/queries/shows.ts` `ShowDetail`/`ShowSummary`.)

- [ ] **Step 5: Commit**

```bash
git add app/_components/show-header.tsx app/_components/show-header.test.tsx
git commit -m "feat(nugs): show-header Listen/Watch (fancy/functional/minimal)"
```

---

## Task 4: Setlist per-track ▷ (all three modes)

**Files:**
- Modify: `app/_components/setlist/index.tsx`, `app/shows/[date]/page.tsx`
- Modify: `app/_components/setlist/{fancy,functional,minimal}.tsx`
- Modify: `app/_components/setlist/{fancy,functional,minimal}.test.tsx`

**Interfaces:**
- Consumes: `nugsTrackHref`, `nugsWebFallback` (Task 1); `NugsLink` (Task 2).
- `Setlist`, `SetlistFancy`, `SetlistFunctional`, `SetlistMinimal` all gain props `showDate: string` and `venue: string | null`.
- Per-row href: `nugsTrackHref({ date: showDate, venue, song: e.song, set: e.setNumber, pos: e.position })`; fallback `nugsWebFallback({ date: showDate, venue })`.

- [ ] **Step 1: Thread props through `index.tsx`**

Replace the body of `app/_components/setlist/index.tsx`:

```tsx
import type { SetlistEntry } from "@/lib/queries/shows";
import type { Experience } from "@/lib/experience";
import { SetlistFancy } from "./fancy";
import { SetlistFunctional } from "./functional";
import { SetlistMinimal } from "./minimal";

export function Setlist({
  entries, experience, showDate, venue,
}: {
  entries: SetlistEntry[];
  experience: Experience;
  showDate: string;
  venue: string | null;
}) {
  if (experience === "functional") return <SetlistFunctional entries={entries} showDate={showDate} venue={venue} />;
  if (experience === "minimal") return <SetlistMinimal entries={entries} showDate={showDate} venue={venue} />;
  return <SetlistFancy entries={entries} showDate={showDate} venue={venue} />;
}
```

- [ ] **Step 2: Pass props from the show page**

In `app/shows/[date]/page.tsx`, change the setlist render (currently `<Setlist entries={setlist} experience={experience} />`) to:

```tsx
<Setlist entries={setlist} experience={experience} showDate={date} venue={show.venue} />
```

- [ ] **Step 3: Write the failing per-mode tests**

In each of `fancy.test.tsx`, `functional.test.tsx`, `minimal.test.tsx`, the `entry()` factory builds a `SetlistEntry`. Update each test to pass the new props and assert the track link. Add this case to each (adjust the component name per file):

```tsx
it("emits a per-track applenugs link", () => {
  const html = renderToStaticMarkup(
    <SetlistFancy
      entries={[entry({ song: "Hot Tea", setNumber: "1", position: 2 })]}
      showDate="2024-04-20"
      venue="The Salt Shed"
    />,
  );
  expect(html).toContain("applenugs://show/2024-04-20?artist=Goose&song=Hot%20Tea&set=1&pos=2");
});
```

(For `functional.test.tsx` use `SetlistFunctional`, for `minimal.test.tsx` use `SetlistMinimal`. Also add `showDate`/`venue` to every existing `renderToStaticMarkup(<Setlist… />)` call in those files so they still typecheck.)

- [ ] **Step 4: Run them, verify failure** — `npx vitest run app/_components/setlist` → FAIL (props/links missing).

- [ ] **Step 5: Implement `fancy.tsx`**

Change the signature and add the per-track link. Signature:
```tsx
export function SetlistFancy({ entries, showDate, venue }: { entries: SetlistEntry[]; showDate: string; venue: string | null }) {
```
Add imports at top:
```tsx
import { NugsLink } from "../nugs-link";
import { nugsTrackHref, nugsWebFallback } from "@/lib/nugs";
```
Add `nugs-row` to the `<li>` clsx (so it becomes `clsx("group relative flex items-baseline gap-3 py-[7px] pl-4 nugs-row", …)`), and add the ▷ at the end of the row, after the `{e.trackTime && …}` span:
```tsx
<NugsLink
  href={nugsTrackHref({ date: showDate, venue, song: e.song, set: e.setNumber, pos: e.position })}
  fallback={nugsWebFallback({ date: showDate, venue })}
  className="nugs-track ml-1 shrink-0"
  title={`Listen to ${e.song} on nugs`}
>▷</NugsLink>
```

- [ ] **Step 6: Implement `functional.tsx`**

Signature:
```tsx
export function SetlistFunctional({ entries, showDate, venue }: { entries: SetlistEntry[]; showDate: string; venue: string | null }) {
```
Imports (it already imports from format; add):
```tsx
import { NugsLink } from "../nugs-link";
import { nugsTrackHref, nugsWebFallback } from "@/lib/nugs";
```
Add a header cell after the `Jam` `<th>`:
```tsx
<th aria-label="Listen"></th>
```
Add `className="nugs-row"` to the row `<tr key={r.e.uniqueId}>` → `<tr key={r.e.uniqueId} className="nugs-row">`, and a trailing `<td>` after the Jam cell:
```tsx
<td>
  <NugsLink
    href={nugsTrackHref({ date: showDate, venue, song: r.e.song, set: r.e.setNumber, pos: r.e.position })}
    fallback={nugsWebFallback({ date: showDate, venue })}
    className="nugs-track"
    title={`Listen to ${r.e.song} on nugs`}
  >▷</NugsLink>
</td>
```

- [ ] **Step 7: Implement `minimal.tsx`**

Signature:
```tsx
export function SetlistMinimal({ entries, showDate, venue }: { entries: SetlistEntry[]; showDate: string; venue: string | null }) {
```
Imports (it already imports `RETURN_LABEL` from format; extend that line and add nugs):
```tsx
import { RETURN_LABEL } from "@/lib/queries/format";
import { NugsLink } from "../nugs-link";
import { nugsTrackHref, nugsWebFallback } from "@/lib/nugs";
```
Add `className="nugs-row"` to the row `<tr key={e.uniqueId}>` → `<tr key={e.uniqueId} className="nugs-row">`, and a trailing `<td>` after the time `<td>`:
```tsx
<td className="num">
  <NugsLink
    href={nugsTrackHref({ date: showDate, venue, song: e.song, set: e.setNumber, pos: e.position })}
    fallback={nugsWebFallback({ date: showDate, venue })}
    className="nugs-track"
  >listen</NugsLink>
</td>
```

- [ ] **Step 8: Run tests, verify pass** — `npx vitest run app/_components/setlist` → PASS. Then `npm run typecheck`.

- [ ] **Step 9: Commit**

```bash
git add app/_components/setlist app/shows/[date]/page.tsx
git commit -m "feat(nugs): per-track hover-reveal listen link in setlist (fancy/functional/minimal)"
```

---

## Task 5: Verify

**Files:** none (verification only).

- [ ] **Step 1: Full suite + typecheck** — `npm test` → all green; `npm run typecheck` → clean.

- [ ] **Step 2: Production build** — stop any dev server first:
```bash
pkill -f "next dev" 2>/dev/null; rm -rf .next
npm run build
```
Expected: build succeeds; `/shows/[date]` still compiles.

- [ ] **Step 3: Behavior pass (dev server)** — `npm run dev`, open a past show in each mode:
  - Show header shows a secondary **Listen on nugs** + **Watch** next to the elgoose link.
  - Setlist rows: on desktop the ▷ (or "listen") is **hidden until row hover**; at a 375px / touch viewport (devtools, `hover: none`) it is **always visible**.
  - Inspect a Listen link → `href` is `applenugs://show/<date>?artist=Goose&venue=…`; a track link carries `song`/`set`/`pos`, all `%20`-encoded (no `+`).
  - Minimal renders plain underlined text ("listen on nugs" / "listen"), no boxes.

- [ ] **Step 4: Fix anything found, then this feature is ready for finishing-a-development-branch.**

---

## Self-Review (done at authoring)

- **Spec coverage:** show-header Listen+Watch ✓ (T3), setlist per-track hover-reveal ✓ (T4), `lib/nugs.ts` builders ✓ (T1), `NugsLink` + web fallback ✓ (T2), track-level contract extension ✓ (T1), per-mode look ✓ (T2 CSS + bespoke markup T3/T4), `%20` encoding ✓ (T1, Global Constraints), tests ✓ (T1/T2/T3/T4), 360px + touch behavior ✓ (T5). Out-of-scope (song-page rows, app-side handler) correctly absent.
- **Type consistency:** `nugsShowHref`/`nugsTrackHref`/`nugsWebFallback`/`NugsMedia` defined in T1 and consumed unchanged in T3/T4. `NugsLink` prop shape fixed in T2, used identically in T3/T4. `Setlist`/variants gain `showDate: string`, `venue: string | null` consistently in T4 (index, three variants, show page, tests).
- **Threading note:** the setlist components don't currently receive date/venue — T4 Step 1–2 thread them before the variants use them, and updates the existing setlist tests' render calls so they keep compiling.

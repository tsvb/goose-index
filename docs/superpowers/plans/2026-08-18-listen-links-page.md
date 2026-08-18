# /listen-links Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/listen-links` page that explains the show-page buttons (Bandcamp / Listen / Watch / Open on nugs.net / setlist ▷) to the person who just clicked one, plus a collapsed developer reference for the `applenugs://` scheme.

**Architecture:** One pure component (`ListenLinksContent`) takes `{ experience, example, coverage }` and renders all three editions, so `renderToStaticMarkup` tests it with no database. A thin server page fetches the most recent past show and one real song title, and every example URL on the page is built by calling the real helpers in `lib/nugs.ts` — nothing retyped, so the page cannot drift from the buttons it documents. A footer link in all three editions and a sitemap entry make it findable.

**Tech Stack:** TypeScript, Next.js 15 (App Router, per-request rendering — the root layout exports `dynamic = "force-dynamic"`), Vitest + `renderToStaticMarkup`, PGlite for the one query test.

**Spec:** [`docs/superpowers/specs/2026-08-18-listen-links-page-design.md`](../specs/2026-08-18-listen-links-page-design.md)
**Depends on:** the merged nugs-web-links feature (`lib/nugs.ts` exports `nugsShowHref`, `nugsTrackHref`, `nugsWebHref`, `nugsWebFallback`; `ShowDetail` carries `nugsContainerId`/`nugsHasVideo`).

## Global Constraints

Every task's requirements implicitly include this section.

- **`DATABASE_URL` handling:** on this machine `.env` points at a LOCAL Postgres (`localhost:5432/goose_almanac`) — the repo's CLAUDE.md claim that it is production Neon is stale here. Regardless: no task in this plan needs any live database. Tests use PGlite (`db/testing.ts`) or mocks. Run no `db:migrate`, `sync`, or `import-nugs`.
- **Copy rules are law** (`CLAUDE.md`): say what a thing is; never claim what the data can contradict; compute findings at render time, never hard-code them. Specifically: nothing may claim a show is **playable** (subscription-dependent), nothing may claim **sign-in returns you to the show** (unverified), and `nugsContainerId == null` means "we couldn't resolve it", never "not on nugs".
- **Never emit `+` for a space in a URL** — Swift's `URLComponents` does not decode `+`. The page must state this rule *with its reason* in the developer section.
- **Example URLs are built by calling the real helpers** (`nugsShowHref` / `nugsTrackHref` / `nugsWebFallback`), never typed as string literals — in the component AND in the tests (tests import the helpers and compare).
- **`renderToStaticMarkup` HTML-escapes `&`, `<` and `>`** in text nodes (and `&` in attributes). The `applenugs://` URLs carry `&` and the dev-section grammar carries `<`/`>`, so every test asserting rendered output goes through `const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")`. Do not "fix" the component to avoid this.
- **All three experiences must render:** `minimal` uses `Doc`/`Breadcrumb`/`DocSection` and plain semantic HTML (no `<svg>`, no `<details>` — reference material stays visible in the plain edition); `functional` and `fancy` share one styled path with the developer reference in a `<details>`.
- **Route is `/listen-links`**, title "How the listen links work". Not `/listen` — the site plays nothing.
- **Verification commands:** `npm run test` and `npm run typecheck` must pass before every commit.

---

### Task 1: The coverage query

**Files:**
- Modify: `lib/queries/shows.ts` (append)
- Test: `lib/queries/shows.test.ts` (exists — append; it has a hoisted `vi.mock("@/db/client")` proxying to PGlite — reuse it, do not add a second harness)

**Interfaces:**
- Consumes: `shows.nugsContainerId` (existing column).
- Produces: `getNugsCoverage(): Promise<{ resolved: number; total: number }>` — consumed by Task 4's page.

- [ ] **Step 1: Write the failing test**

Append to `lib/queries/shows.test.ts`. The file's PGlite database is shared and already seeded by other blocks, so assert **deltas**, not absolute counts. Add `getNugsCoverage` to the static import from `./shows`; `upsertArtists`/`upsertShows` and `sql` are already imported.

```ts
describe("getNugsCoverage", () => {
  it("counts resolved and total shows, live", async () => {
    const before = await getNugsCoverage();
    // Idempotent re-upsert — the artist may already exist from other blocks.
    await upsertArtists(ctx.db, [{ artistId: 1205, name: "Goose" }]);
    await upsertShows(ctx.db, [{ showId: 47000, showDate: "2024-05-01", artistId: 1205,
      venueId: null, tourId: null, title: null, permalink: null, showOrder: 1, notes: null,
      createdAt: null, updatedAt: null }]);
    await ctx.db.execute(sql`update shows set nugs_container_id = 47001 where show_id = 47000`);
    const after = await getNugsCoverage();
    expect(after.total).toBe(before.total + 1);
    expect(after.resolved).toBe(before.resolved + 1);
    expect(after.resolved).toBeLessThanOrEqual(after.total);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/queries/shows.test.ts`
Expected: FAIL — `getNugsCoverage` is not exported.

- [ ] **Step 3: Implement**

Append to `lib/queries/shows.ts`:

```ts
/** How many shows currently resolve to a nugs container. The /listen-links page
 *  states this at render time — copy rule 5: never hard-code a figure the
 *  nightly import can change. Resolved means "we matched a container", NOT
 *  "the rest aren't on nugs" — the site cannot know that. */
export async function getNugsCoverage(): Promise<{ resolved: number; total: number }> {
  const [row] = await db
    .select({
      resolved: sql<number>`count(*) filter (where ${shows.nugsContainerId} is not null)::int`,
      total: sql<number>`count(*)::int`,
    })
    .from(shows);
  return row ?? { resolved: 0, total: 0 };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/queries/shows.test.ts && npm run typecheck`
Expected: PASS, all pre-existing tests included.

- [ ] **Step 5: Commit**

```bash
git add lib/queries/shows.ts lib/queries/shows.test.ts
git commit -m "feat(listen-links): count nugs coverage at render time"
```

---

### Task 2: The page component — fan-facing content

**Files:**
- Create: `app/_components/listen-links.tsx`
- Test: `app/_components/listen-links.test.tsx`

**Interfaces:**
- Consumes: `nugsShowHref`, `nugsTrackHref`, `nugsWebFallback` from `@/lib/nugs`; `NugsLink` from `./nugs-link`; `Doc`, `Breadcrumb`, `DocSection` from `./doc`; `Container` from `./container`; `Experience` from `@/lib/experience`.
- Produces: `ListenLinksContent({ experience, example, coverage })`, `type ListenExample = { date: string; venue: string | null; containerId: number | null; song: string | null }`, `type NugsCoverage = { resolved: number; total: number }` — consumed by Tasks 3 and 4.

- [ ] **Step 1: Write the failing tests**

Create `app/_components/listen-links.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ListenLinksContent, type ListenExample } from "./listen-links";
import { nugsShowHref, nugsTrackHref, nugsWebFallback } from "@/lib/nugs";

// renderToStaticMarkup escapes &, < and > in text nodes (and & in attributes).
// The applenugs:// URLs carry &, and the dev-section grammar carries < and > —
// every toContain against rendered output must go through this.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const example: ListenExample = {
  date: "2024-04-20", venue: "The Salt Shed", containerId: 46887, song: "Hot Tea",
};
const coverage = { resolved: 476, total: 855 };

const render = (experience: "minimal" | "functional" | "fancy", ex: ListenExample | null = example, cov = coverage as { resolved: number; total: number } | null) =>
  renderToStaticMarkup(<ListenLinksContent experience={experience} example={ex} coverage={cov} />);

describe("ListenLinksContent", () => {
  it("renders one h1 in every edition", () => {
    for (const e of ["minimal", "functional", "fancy"] as const) {
      const html = render(e);
      expect(html.match(/<h1/g)).toHaveLength(1);
      expect(html).toContain("How the listen links work");
    }
  });

  it("prints the URL the real helper builds — same code path as the buttons", () => {
    const html = render("fancy");
    expect(html).toContain(esc(nugsShowHref({ date: example.date, venue: example.venue })));
    expect(html).toContain(esc(nugsShowHref({ date: example.date, venue: example.venue, media: "video" })));
    expect(html).toContain(esc(nugsTrackHref({ date: example.date, venue: example.venue, song: "Hot Tea" })));
  });

  it("encodes a space as %20 and never as +", () => {
    const html = render("minimal");
    expect(html).toContain("The%20Salt%20Shed");
    expect(html).not.toContain("The+Salt+Shed");
  });

  it("the try-it link falls back to the exact release when the container is known", () => {
    const html = render("fancy");
    expect(html).toContain(`data-fallback="${nugsWebFallback({ date: example.date, venue: example.venue, containerId: 46887 })}"`);
    expect(html).toContain("https://play.nugs.net/release/46887");
  });

  it("the try-it link falls back to the search when no container is known", () => {
    const html = render("fancy", { ...example, containerId: null });
    expect(html).toContain(esc(nugsWebFallback({ date: example.date, venue: example.venue, containerId: null })));
    expect(html).not.toContain("play.nugs.net/release/");
  });

  it("with no example, the explanation renders and the try-it block is gone", () => {
    const html = render("fancy", null);
    expect(html).toContain("How the listen links work");
    // Not "applenugs://show/" bare — Task 3's grammar line legitimately contains
    // that prefix. A real example URL always has a date, which starts with a digit.
    expect(html).not.toContain("applenugs://show/2");
  });

  it("with no song, the track-level example drops out", () => {
    const html = render("fancy", { ...example, song: null });
    // Not "song=" bare — Task 3's parameter table legitimately contains
    // "song=<title>". The concrete track URL is what must be gone.
    expect(html).not.toContain(esc(nugsTrackHref({ date: example.date, venue: example.venue, song: "Hot Tea" })));
    expect(html).not.toContain("song=Hot%20Tea");
    expect(html).toContain(esc(nugsShowHref({ date: example.date, venue: example.venue })));
  });

  it("states coverage as a computed fraction, and omits it without data", () => {
    expect(render("fancy")).toContain("476 of 855");
    expect(render("fancy", example, null)).not.toContain("link straight to their page");
  });

  it("never claims playability or a post-sign-in return", () => {
    for (const e of ["minimal", "functional", "fancy"] as const) {
      const html = render(e).toLowerCase();
      expect(html).not.toContain("you can play");
      expect(html).not.toContain("returns you to");
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/_components/listen-links.test.tsx`
Expected: FAIL — cannot resolve `./listen-links`.

- [ ] **Step 3: Implement the component**

Create `app/_components/listen-links.tsx`. The section bodies are plain semantic HTML (`p`/`ul`/`code`) so the SAME content components render inside the minimal `Doc` and the styled shell — copy is written once. The developer reference is Task 3; this task ships a placeholder-free page without it.

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
import type { Experience } from "@/lib/experience";
import { Doc, Breadcrumb, DocSection } from "./doc";
import { Container } from "./container";
import { NugsLink } from "./nugs-link";
import { nugsShowHref, nugsTrackHref, nugsWebFallback } from "@/lib/nugs";

export type ListenExample = {
  date: string;
  venue: string | null;
  containerId: number | null;
  song: string | null;
};

export type NugsCoverage = { resolved: number; total: number };

/** Every URL on the page comes from the same helpers the buttons call —
 *  documentation that cannot drift from the behaviour it documents. */
function buildUrls(example: ListenExample) {
  return {
    listen: nugsShowHref({ date: example.date, venue: example.venue }),
    watch: nugsShowHref({ date: example.date, venue: example.venue, media: "video" }),
    track: example.song
      ? nugsTrackHref({ date: example.date, venue: example.venue, song: example.song })
      : null,
    fallback: nugsWebFallback({ date: example.date, venue: example.venue, containerId: example.containerId }),
  };
}

function ButtonsBody() {
  return (
    <ul>
      <li><strong>◈ Bandcamp</strong> — buys the night from the band, when they have released it. Buying there pays them, which is why it comes first.</li>
      <li><strong>▷ Listen on nugs</strong> and <strong>▷ Watch</strong> — hand the show to AppleNugs, a Mac app for nugs.net, at that night. Watch opens its video side.</li>
      <li><strong>▷ on a setlist row</strong> — the same handoff, started at that song.</li>
      <li><strong>↗ Open on nugs.net</strong> — the show&rsquo;s own page in the nugs web player. It appears only when we know that exact page.</li>
    </ul>
  );
}

function ClickBody() {
  return (
    <p>
      The Listen, Watch and row buttons hand your browser an <code>applenugs://</code> link.
      If AppleNugs is installed, it opens and finds the show on nugs by artist, date and venue.
      If nothing claims the link after about a second and you are still on the page, you are
      sent to nugs.net instead — straight to the show&rsquo;s page when we know it, or to a
      search for it when we don&rsquo;t. Watch does the same for the video side, when the show
      has one.
    </p>
  );
}

function NeedsBody() {
  return (
    <ul>
      <li>A <a href="https://nugs.net" target="_blank" rel="noopener noreferrer">nugs.net</a> subscription. These buttons open what a subscription already includes, and nugs.net asks you to sign in.</li>
      <li><a href="https://github.com/tsvb/applenugs/releases/latest" target="_blank" rel="noopener noreferrer">AppleNugs for macOS</a> — signed, notarized, updates itself.</li>
      <li>On iPhone, AppleNugs is personal-install only — you build it yourself. There is no App Store version and no TestFlight, so on a phone these buttons land on the nugs website.</li>
    </ul>
  );
}

function LimitsBody({ coverage }: { coverage: NugsCoverage | null }) {
  return (
    <>
      <p>
        This index holds no nugs catalog. A night listed here isn&rsquo;t necessarily on nugs,
        and landing on an empty search means nugs doesn&rsquo;t have that night — not that the
        link broke.
        {coverage && coverage.total > 0 && (
          <> As of today, {coverage.resolved} of {coverage.total} shows here link straight to
          their page on nugs.net; the rest fall back to a search.</>
        )}
      </p>
      <p>
        Two shows on one day are told apart by venue; where that isn&rsquo;t enough, the app
        asks rather than guessing. And a web link reaches a show, never one song — the
        row&rsquo;s ▷ starts the <em>app</em> at the song, but without the app you land on the
        whole show.
      </p>
    </>
  );
}

function TryItBody({ example, urls }: { example: ListenExample; urls: ReturnType<typeof buildUrls> }) {
  return (
    <>
      <p>
        These are the real thing, built for {example.date}
        {example.venue ? <> at {example.venue}</> : null} the same way every show page builds
        its buttons. Clicking tells you whether the handoff works on <em>your</em> machine —
        it doesn&rsquo;t say whether the show is on nugs.
      </p>
      <p>
        <NugsLink href={urls.listen} fallback={urls.fallback} className="nugs-show" title="Play this show on nugs">▷ Listen on nugs</NugsLink>
      </p>
      <p>The link behind that button:</p>
      <p><code>{urls.listen}</code></p>
      {urls.track && (
        <>
          <p>And the same show, started at &ldquo;{example.song}&rdquo;:</p>
          <p><code>{urls.track}</code></p>
        </>
      )}
      <p>Where it sends you if the app doesn&rsquo;t open:</p>
      <p><code>{urls.fallback}</code></p>
    </>
  );
}

/** Placeholder seam for Task 3 — the developer reference renders here. */
function DevReference({ minimal }: { minimal: boolean }) {
  void minimal;
  return null;
}

const SECTIONS = (example: ListenExample | null, coverage: NugsCoverage | null) => {
  const urls = example ? buildUrls(example) : null;
  const list: { title: string; body: ReactNode }[] = [
    { title: "The buttons", body: <ButtonsBody /> },
    { title: "What a click does", body: <ClickBody /> },
    { title: "What you need", body: <NeedsBody /> },
    { title: "What this page can't promise", body: <LimitsBody coverage={coverage} /> },
  ];
  if (example && urls) list.push({ title: "Try it", body: <TryItBody example={example} urls={urls} /> });
  return list;
};

export function ListenLinksContent({
  experience, example, coverage,
}: { experience: Experience; example: ListenExample | null; coverage: NugsCoverage | null }) {
  const sections = SECTIONS(example, coverage);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Listen links" }]} />
          <h1>How the listen links work</h1>
          {sections.map((s) => (
            <DocSection key={s.title} title={s.title}>{s.body}</DocSection>
          ))}
          <DevReference minimal />
        </Doc>
      </Container>
    );
  }

  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <span className="eyebrow">Listen links</span>
      <h1 className="mt-3 font-display text-4xl tracking-tight text-ink sm:text-5xl">
        How the listen links work
      </h1>
      <div className="mt-8 space-y-10 leading-relaxed text-muted [&_code]:text-[0.85em] [&_code]:break-all [&_strong]:text-ink">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="mb-3 font-display text-xl text-ink">{s.title}</h2>
            {s.body}
          </section>
        ))}
        <DevReference minimal={false} />
      </div>
    </Container>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/_components/listen-links.test.tsx && npm run typecheck`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add app/_components/listen-links.tsx app/_components/listen-links.test.tsx
git commit -m "feat(listen-links): the fan-facing page content, URLs built by the real helpers"
```

---

### Task 3: The developer reference

**Files:**
- Modify: `app/_components/listen-links.tsx` (replace the `DevReference` placeholder)
- Test: `app/_components/listen-links.test.tsx` (append)

**Interfaces:**
- Consumes: the `DevReference({ minimal })` seam from Task 2.
- Produces: nothing new — internal to the component.

- [ ] **Step 1: Write the failing tests**

Append to `app/_components/listen-links.test.tsx`, inside the existing `describe`:

```tsx
  it("the developer reference is collapsed on styled editions, plain on minimal", () => {
    expect(render("fancy")).toContain("<details");
    expect(render("functional")).toContain("<details");
    const minimal = render("minimal");
    expect(minimal).not.toContain("<details");
    expect(minimal).toContain("How the links are built");
  });

  it("documents the grammar, the %20 rule with its reason, and the repo", () => {
    const html = render("minimal");
    expect(html).toContain(esc("applenugs://show/<YYYY-MM-DD>?artist=<name>"));
    expect(html).toContain("%20");
    expect(html).toContain("URLComponents");   // the reason, not just the rule
    expect(html).toContain("github.com/tsvb/applenugs");
  });

  it("renders the parameter table as a real table in every edition", () => {
    for (const e of ["minimal", "functional", "fancy"] as const) {
      const html = render(e);
      expect(html).toContain("<table");
      expect(html).toContain("venue=");
    }
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run app/_components/listen-links.test.tsx`
Expected: the three new tests FAIL (DevReference renders null); the nine from Task 2 still pass.

- [ ] **Step 3: Implement**

In `app/_components/listen-links.tsx`, replace the placeholder `DevReference` with:

```tsx
/** The applenugs:// grammar, one row per part. A real <table> in every edition —
 *  this is reference material, not decoration. */
const PARAMS: { part: string; required: string; notes: string }[] = [
  { part: "applenugs://", required: "yes", notes: "The scheme AppleNugs registers. Not nugs:// — that belongs to the official app." },
  { part: "show/<YYYY-MM-DD>", required: "yes", notes: "The performance date — the one identifier this site and nugs share natively." },
  { part: "artist=<name>", required: "yes", notes: "Band name, e.g. Goose. Keeps the app's handler generic instead of hardcoding one artist." },
  { part: "venue=<venue>", required: "no", notes: "Tie-break for two-show days. If it still can't decide, the app presents the matches." },
  { part: "song=<title>&set=<n>&pos=<n>", required: "no", notes: "Start playback at one song; set/pos disambiguate a song played twice." },
  { part: "media=audio|video", required: "no", notes: "audio when omitted." },
];

function DevReferenceBody() {
  return (
    <>
      <p>The buttons emit this grammar:</p>
      <p><code>{"applenugs://show/<YYYY-MM-DD>?artist=<name>[&venue=<venue>][&song=<title>&set=<n>&pos=<n>][&media=audio|video]"}</code></p>
      <table>
        <thead>
          <tr><th>Part</th><th>Required</th><th>Notes</th></tr>
        </thead>
        <tbody>
          {PARAMS.map((p) => (
            <tr key={p.part}>
              <td><code>{p.part}</code></td>
              <td>{p.required}</td>
              <td>{p.notes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>
        Query values are percent-encoded with <code>%20</code> for spaces — never <code>+</code>.
        Swift&rsquo;s <code>URLComponents</code> does not decode <code>+</code> to a space, so a{" "}
        <code>+</code> reaches the app literally.
      </p>
      <p>
        Song titles are matched against the resolved show&rsquo;s track list in three tiers:
        exact normalized match, then a track title that contains the song, then the longest
        track title the song contains (so a segue link like &ldquo;Madhuvan &gt; Hot Tea&rdquo;
        still lands on &ldquo;Madhuvan&rdquo;).
      </p>
      <p>
        Without the app, the same buttons fall back to the nugs web player —{" "}
        <code>{"https://play.nugs.net/release/<id>"}</code>, or{" "}
        <code>{"https://play.nugs.net/watch/release/<id>"}</code> for video — when this site
        has resolved the show&rsquo;s id, and to a search otherwise. There is no per-track web
        route.
      </p>
      <p>
        The app, and the full contract, live at{" "}
        <a href="https://github.com/tsvb/applenugs" target="_blank" rel="noopener noreferrer">github.com/tsvb/applenugs</a>.
      </p>
    </>
  );
}

function DevReference({ minimal }: { minimal: boolean }) {
  if (minimal) {
    return (
      <DocSection title="How the links are built">
        <DevReferenceBody />
      </DocSection>
    );
  }
  return (
    <details className="border-t border-line pt-4">
      <summary className="cursor-pointer font-display text-xl text-ink">How the links are built</summary>
      <div className="mt-4 space-y-4 [&_table]:w-full [&_td]:border-t [&_td]:border-line [&_td]:py-2 [&_td]:pr-3 [&_th]:pb-2 [&_th]:pr-3 [&_th]:text-left">
        <DevReferenceBody />
      </div>
    </details>
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/_components/listen-links.test.tsx && npm run typecheck`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add app/_components/listen-links.tsx app/_components/listen-links.test.tsx
git commit -m "feat(listen-links): the developer reference for the applenugs:// grammar"
```

---

### Task 4: The route

**Files:**
- Create: `app/listen-links/page.tsx`
- Test: `app/listen-links/page.test.tsx`

**Interfaces:**
- Consumes: `ListenLinksContent`, `ListenExample` (Task 2); `getNugsCoverage` (Task 1); `getRecentShows`, `getShowDetails`, `getSetlist` from `@/lib/queries/shows`; `getExperience` from `@/lib/experience.server`; `canonicalUrl` from `@/lib/site`.
- Produces: the `/listen-links` route.

- [ ] **Step 1: Write the failing test**

Create `app/listen-links/page.test.tsx`, following the `app/page.test.tsx` mock pattern:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({
  experience: "fancy",
  recent: [] as Record<string, unknown>[],
  details: [] as Record<string, unknown>[],
  setlist: [] as Record<string, unknown>[],
  coverage: { resolved: 476, total: 855 },
}));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/shows", () => ({
  getRecentShows: async () => h.recent,
  getShowDetails: async () => h.details,
  getSetlist: async () => h.setlist,
  getNugsCoverage: async () => h.coverage,
}));

import ListenLinksPage, { metadata } from "./page";
import { canonicalUrl } from "@/lib/site";
import { nugsShowHref } from "@/lib/nugs";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

beforeEach(() => {
  h.experience = "fancy";
  h.recent = [{ showId: 9, date: "2024-04-20", order: 1, venue: "The Salt Shed", city: "Chicago",
    state: "IL", country: "USA", tour: null, tourId: null, songCount: 2, hasNotes: false }];
  h.details = [{ showId: 9, date: "2024-04-20", order: 1, venue: "The Salt Shed", city: "Chicago",
    state: "IL", country: "USA", tour: null, tourId: null, songCount: 2, hasNotes: false,
    venueId: 1, permalink: null, notes: null, bandcampUrl: null,
    nugsContainerId: 46887, nugsHasVideo: true }];
  h.setlist = [{ uniqueId: "1", songId: 1, song: "Hot Tea", slug: "hot-tea", setType: "Set",
    setNumber: "1", position: 1, trackTime: null, transition: null, isJamchart: false,
    jamchartNotes: null, isJam: false, isReprise: false, isOriginal: true,
    originalArtist: null, footnote: null, gap: null, isDustedOff: false }];
});

describe("ListenLinksPage", () => {
  it("declares its canonical URL", () => {
    expect(metadata.alternates?.canonical).toBe(canonicalUrl("/listen-links"));
  });

  it("feeds the most recent show into the example, matched by showId", async () => {
    const html = renderToStaticMarkup(await ListenLinksPage());
    expect(html).toContain(esc(nugsShowHref({ date: "2024-04-20", venue: "The Salt Shed" })));
    expect(html).toContain("476 of 855");
  });

  it("renders the explanation even with an empty database", async () => {
    h.recent = [];
    const html = renderToStaticMarkup(await ListenLinksPage());
    expect(html).toContain("How the listen links work");
    expect(html).not.toContain("applenugs://show/");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/listen-links/page.test.tsx`
Expected: FAIL — cannot resolve `./page`.

- [ ] **Step 3: Implement**

Create `app/listen-links/page.tsx`:

```tsx
import type { Metadata } from "next";
import { getExperience } from "@/lib/experience.server";
import { getRecentShows, getShowDetails, getSetlist, getNugsCoverage } from "@/lib/queries/shows";
import { ListenLinksContent, type ListenExample } from "@/app/_components/listen-links";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "How the listen links work",
  alternates: { canonical: canonicalUrl("/listen-links") },
};

export default async function ListenLinksPage() {
  const experience = await getExperience();

  // The live example: the most recent past show, and one real song title.
  // Every URL is then built by the same helpers the buttons call. An empty
  // database renders the explanation with the try-it block omitted.
  const [recent] = await getRecentShows(1);
  let example: ListenExample | null = null;
  if (recent) {
    const details = await getShowDetails(recent.date);
    // Two-show days: pick the row for THIS show so venue and container stay aligned.
    const show = details.find((d) => d.showId === recent.showId) ?? details[0] ?? null;
    if (show) {
      const setlist = await getSetlist(show.showId);
      example = {
        date: show.date,
        venue: show.venue,
        containerId: show.nugsContainerId,
        song: setlist[0]?.song ?? null,
      };
    }
  }

  const coverage = await getNugsCoverage();
  return <ListenLinksContent experience={experience} example={example} coverage={coverage} />;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/listen-links/page.test.tsx && npm run typecheck`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add app/listen-links/page.tsx app/listen-links/page.test.tsx
git commit -m "feat(listen-links): the /listen-links route with a live example"
```

---

### Task 5: Footer links in all three editions

**Files:**
- Modify: `app/_components/site-footer.tsx`
- Test: `app/_components/site-footer.test.tsx` (exists — append)

**Interfaces:**
- Consumes: the `/listen-links` route (Task 4). `Link` is already imported in the footer.
- Produces: nothing new.

- [ ] **Step 1: Write the failing test**

Append to `app/_components/site-footer.test.tsx`:

```tsx
describe("SiteFooter listen-links entry", () => {
  it("every edition links the listen-links page", () => {
    for (const F of [FooterMinimal, FooterFunctional, FooterFancy]) {
      const html = renderToStaticMarkup(<F />);
      expect(html).toContain('href="/listen-links"');
      expect(html.toLowerCase()).toContain("listen links");
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/_components/site-footer.test.tsx`
Expected: the new test FAILS; existing tests pass.

- [ ] **Step 3: Implement**

In `app/_components/site-footer.tsx`:

**Fancy** — in the Source column (it explains site behaviour; it is not a browse destination), after the Bandcamp paragraph:

```tsx
          <p className="mt-2 leading-relaxed">
            <Link href="/listen-links" className="link">How the listen links work</Link>.
          </p>
```

**Functional** — extend the first `<span>`'s dense line:

```tsx
          <span>© {new Date().getFullYear()} Goose Index · data from elgoose.net · <a href={BANDCAMP_HOME} target="_blank" rel="noreferrer" className="underline">support Goose on Bandcamp</a> · <Link href="/listen-links" className="underline">how the listen links work</Link></span>
```

**Minimal** — a sentence at the end of the first `<p>` (after the Bandcamp sentence):

```tsx
          {" "}<Link href="/listen-links">How the listen links work</Link>.
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/_components/site-footer.test.tsx && npm run typecheck`
Expected: PASS — including the pre-existing "minimal has no `<svg>`" assertion.

- [ ] **Step 5: Commit**

```bash
git add app/_components/site-footer.tsx app/_components/site-footer.test.tsx
git commit -m "feat(listen-links): footer entry in all three editions"
```

---

### Task 6: Sitemap, whole-suite gate, and build

**Files:**
- Modify: `app/sitemap.ts` (static route array)
- Test: `app/sitemap.test.ts` (exists — extend one assertion)

- [ ] **Step 1: Write the failing test**

In `app/sitemap.test.ts`, extend the static-routes loop in "lists the section indexes":

```ts
    for (const path of ["/shows", "/songs", "/stats", "/tours", "/venues", "/years", "/on-this-day", "/listen-links"]) {
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/sitemap.test.ts`
Expected: FAIL — `/listen-links` missing.

- [ ] **Step 3: Implement**

In `app/sitemap.ts`, add the route to the static array:

```ts
    ...["/shows", "/songs", "/stats", "/tours", "/venues", "/years", "/on-this-day", "/listen-links"].map(page),
```

- [ ] **Step 4: Run the full gate**

```bash
npx vitest run app/sitemap.test.ts
npm run test
npm run typecheck
npm run build
```

Expected: sitemap test PASS; full suite green; typecheck clean; `next build` compiles `/listen-links` (the root layout's `force-dynamic` means no prerender — the build only compiles; it may read the local `.env` database, which is fine).

- [ ] **Step 5: Commit**

```bash
git add app/sitemap.ts app/sitemap.test.ts
git commit -m "feat(listen-links): sitemap entry"
```

---

### Task 7: Visual check in all three editions

No new code — a screenshot pass before calling it done, because this page is copy and layout.

- [ ] **Step 1:** Start the dev server (`npm run dev`) and open `http://localhost:3000/listen-links`.
- [ ] **Step 2:** In each edition (gear/settings switcher: 3.0 fancy, 2.0 functional, 1.0 minimal): the page renders with one h1; the try-it button looks like the show pages' nugs buttons; the `<details>` opens (styled) / the reference is visible inline (minimal); the example URLs wrap rather than overflow on a narrow window (~375px).
- [ ] **Step 3:** Click "▷ Listen on nugs" once on a machine WITHOUT AppleNugs (or note for the maintainer): after ~1.2s you should land on the show's `play.nugs.net` page (or the search if unresolved). Record the outcome in the commit message or hand it to the maintainer if the machine has the app installed.
- [ ] **Step 4:** Stop the dev server. If anything needed fixing, fix it with a test where feasible, and commit.

---

## Not in this plan

- **Any change to `lib/nugs.ts`, `NugsLink`, or the show-page buttons** — the page documents them; it does not alter them.
- **An inline "what's this?" beside the buttons** — entry is footer-only by decision.
- **Updating `docs/integrations/applenugs-deeplink.md`** — already chipped as its own follow-up task.
- **Install detection beyond the ~1.2s race `NugsLink` already runs.**

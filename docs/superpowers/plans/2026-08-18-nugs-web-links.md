# nugs.net Web Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Link every show page to its exact page on play.nugs.net instead of dumping the visitor into a search.

**Architecture:** A nightly import pages nugs's unauthenticated catalog API into a `nugs_containers` table, resolves each container to a show by date (venue breaks ties), and stores the winner on `shows`. Pure modules do the parsing and matching so they unit-test without network or database; a thin script wires them together, mirroring the existing `lib/sync` + `scripts/sync.ts` split. The stored ID turns `nugsWebFallback` into an exact URL and powers one new "Open on nugs.net" control.

**Tech Stack:** TypeScript, Next.js 15 (App Router), Drizzle ORM, Postgres (Neon in production, Docker locally), PGlite for database tests, Vitest.

**Spec:** [`docs/superpowers/specs/2026-08-18-nugs-web-links-design.md`](../specs/2026-08-18-nugs-web-links-design.md)

## Global Constraints

Every task's requirements implicitly include this section.

- **`DATABASE_URL` in `.env` points at PRODUCTION (Neon).** `npm run db:migrate` and every import script write straight to it. Do all development and testing against the local Docker database:
  ```bash
  npm run db:up
  export DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose'
  ```
  Trust the target line each script prints via `announceTarget`, not any doc.
- **Never build links from the nugs API's `pageURL` field.** It 301s to `https://www.nugs.net/404/`. The only valid shapes are `https://play.nugs.net/release/<id>` and `https://play.nugs.net/watch/release/<id>`.
- **Never emit `+` for a space in a URL.** Swift's `URLComponents` does not decode `+`, so it reaches the app literally. Use `encodeURIComponent`, never `URLSearchParams`.
- **Copy rules apply** (`CLAUDE.md`): say what a thing is; never claim what the data can contradict; compute findings, never hard-code them. Do not write copy claiming a show is playable or that sign-in returns the visitor to the show.
- **All three experiences must render** — `minimal`, `functional`, `fancy`. A change to `show-header.tsx` touches three call sites.
- **Verification commands:** `npm run test` (vitest), `npm run typecheck`. Both must pass before every commit.
- **Figures are dated.** Counts taken 2026-08-18: 490 audio containers, 483 distinct dates, 203 video containers. They move nightly; never assert an exact count in a test.

---

### Task 1: Web URL helpers

**Files:**
- Modify: `lib/nugs.ts`
- Test: `lib/nugs.test.ts` (exists — append)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `nugsWebHref(o: { containerId: number; media?: NugsMedia }): string`
  - `nugsWebFallback(o: { date: string; venue?: string | null; containerId?: number | null; media?: NugsMedia }): string` — existing call sites keep compiling; new optional fields only.

- [ ] **Step 1: Write the failing tests**

Append to `lib/nugs.test.ts`, inside the existing top-level `describe`:

```ts
  it("web href: the audio route is /release/<id>", () => {
    expect(nugsWebHref({ containerId: 46887 }))
      .toBe("https://play.nugs.net/release/46887");
  });
  it("web href: the video route is /watch/release/<id>", () => {
    expect(nugsWebHref({ containerId: 46887, media: "video" }))
      .toBe("https://play.nugs.net/watch/release/46887");
  });
  it("web fallback: an exact release URL when the container is known", () => {
    expect(nugsWebFallback({ date: "2024-04-20", containerId: 46887 }))
      .toBe("https://play.nugs.net/release/46887");
  });
  it("web fallback: the video route when the caller asks for video", () => {
    expect(nugsWebFallback({ date: "2024-04-20", containerId: 46887, media: "video" }))
      .toBe("https://play.nugs.net/watch/release/46887");
  });
  it("web fallback: falls back to search when no container is known", () => {
    expect(nugsWebFallback({ date: "2024-04-20", containerId: null }))
      .toBe("https://play.nugs.net/#/search?searchTerm=Goose%202024-04-20");
    expect(nugsWebFallback({ date: "2024-04-20" }))
      .toBe("https://play.nugs.net/#/search?searchTerm=Goose%202024-04-20");
  });
```

Update the import line at the top of the file to include `nugsWebHref`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run lib/nugs.test.ts`
Expected: FAIL — `nugsWebHref is not a function` (or an import error).

- [ ] **Step 3: Implement**

Append to `lib/nugs.ts`:

```ts
/** The nugs web player's own routes, read from its router table on 2026-08-18:
 *  `{path:"/release", children:[{path:":id(\\d+)"}]}` and
 *  `{path:"/watch",   children:[{path:"release/:id(\\d+)"}]}`.
 *  Do NOT build these from the API's `pageURL` field — it 301s to /404/. */
export function nugsWebHref(o: { containerId: number; media?: NugsMedia }): string {
  const path = o.media === "video" ? "watch/release" : "release";
  return `https://play.nugs.net/${path}/${o.containerId}`;
}
```

Replace the existing `nugsWebFallback` with:

```ts
/** Where a click goes when AppleNugs doesn't open. With a resolved containerID
 *  this is the show's exact page; without one it stays the old artist+date search,
 *  so an unmatched show degrades to the previous behaviour rather than a dead end.
 *  play.nugs.net requires a login — this lands the visitor at the show, it does
 *  not assert they can play it. */
export function nugsWebFallback(o: {
  date: string; venue?: string | null; containerId?: number | null; media?: NugsMedia;
}): string {
  if (o.containerId != null) return nugsWebHref({ containerId: o.containerId, media: o.media });
  return `https://play.nugs.net/#/search?searchTerm=${encodeURIComponent(`${ARTIST} ${o.date}`)}`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/nugs.test.ts && npm run typecheck`
Expected: PASS, including the two pre-existing fallback tests (they pass no `containerId`, so they take the search branch unchanged).

- [ ] **Step 5: Commit**

```bash
git add lib/nugs.ts lib/nugs.test.ts
git commit -m "feat(nugs): build exact play.nugs.net URLs from a containerID"
```

---

### Task 2: Schema and migration

**Files:**
- Modify: `db/schema.ts`
- Create: `drizzle/<generated>.sql` (produced by `npm run db:generate`)
- Test: `db/schema.test.ts` (exists — append)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `nugsContainers` table: `containerId: number` (PK), `performanceDate: string`, `venueName/venueCity/venueState: string | null`, `hasVideo: boolean`, `fetchedAt: Date | null`.
  - `shows.nugsContainerId: number | null`, `shows.nugsHasVideo: boolean | null`.

- [ ] **Step 1: Write the failing test**

Append to `db/schema.test.ts`:

```ts
describe("nugs container storage", () => {
  it("stores a container and resolves it onto a show", async () => {
    await ctx.db.insert(schema.nugsContainers).values({
      containerId: 46887,
      performanceDate: "2026-08-16",
      venueName: "Grand Theatre at Grand Sierra Resort",
      venueCity: "Reno",
      venueState: "NV",
      hasVideo: false,
    });
    const rows = await ctx.db.select().from(schema.nugsContainers);
    expect(rows).toHaveLength(1);
    expect(rows[0].containerId).toBe(46887);
    expect(rows[0].hasVideo).toBe(false);
  });

  it("shows carry a nullable resolved container", async () => {
    await ctx.db.insert(schema.artists).values({ artistId: 1205, name: "Goose (nugs test)" });
    await ctx.db.insert(schema.shows).values({
      showId: 90001, showDate: "2026-08-16", artistId: 1205,
      nugsContainerId: 46887, nugsHasVideo: true,
    });
    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId, video: schema.shows.nugsHasVideo })
      .from(schema.shows)
      .where(sql`${schema.shows.showId} = 90001`);
    expect(row).toEqual({ id: 46887, video: true });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run db/schema.test.ts`
Expected: FAIL — `schema.nugsContainers` is undefined.

- [ ] **Step 3: Add the schema**

Append to `db/schema.ts`, after `liveSyncState` and before the `AppDb` type export:

```ts
/** What nugs's catalog API said, kept raw. The resolved winner lives on `shows`;
 *  this table is what lets `verify` tell "nugs doesn't have this night" apart from
 *  "we failed to match it". `fetched_at` makes staleness visible. */
export const nugsContainers = pgTable("nugs_containers", {
  containerId: integer("container_id").primaryKey(),
  performanceDate: date("performance_date").notNull(),
  venueName: text("venue_name"),
  venueCity: text("venue_city"),
  venueState: text("venue_state"),
  hasVideo: boolean("has_video").notNull().default(false),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }),
}, (t) => ({
  dateIdx: index("nugs_containers_date_idx").on(t.performanceDate),
}));
```

In the `shows` table, add two columns immediately after `bandcampUrl`:

```ts
  nugsContainerId: integer("nugs_container_id"),
  nugsHasVideo: boolean("nugs_has_video"),
```

- [ ] **Step 4: Generate the migration**

Run: `npm run db:generate`
Expected: a new file under `drizzle/` creating `nugs_containers`, its index, and two `ALTER TABLE shows ADD COLUMN` statements. Read the generated SQL and confirm it contains no `DROP` — if it does, stop and report it rather than applying it.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run db/schema.test.ts && npm run typecheck`
Expected: PASS. PGlite runs the migration folder, so the new file is exercised.

- [ ] **Step 6: Commit**

```bash
git add db/schema.ts db/schema.test.ts drizzle/
git commit -m "feat(db): store nugs containers and the container resolved per show"
```

---

### Task 3: Parse the catalog payload

**Files:**
- Create: `lib/nugs-catalog/parse.ts`
- Test: `lib/nugs-catalog/parse.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type NugsContainer = { containerId: number; performanceDate: string; venueName: string | null; venueCity: string | null; venueState: string | null; hasVideo: boolean }`
  - `toISODate(s: unknown): string | null`
  - `parseContainers(json: unknown, opts?: { hasVideo?: boolean }): NugsContainer[]`

- [ ] **Step 1: Write the failing test**

Create `lib/nugs-catalog/parse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { parseContainers, toISODate } from "./parse";

const envelope = (containers: unknown[]) => ({ Response: { containers } });

describe("toISODate", () => {
  it("converts the API's slashed date to ISO", () => {
    expect(toISODate("2026/08/16")).toBe("2026-08-16");
  });
  it("rejects anything that isn't a full date", () => {
    expect(toISODate("")).toBeNull();
    expect(toISODate(null)).toBeNull();
    expect(toISODate(undefined)).toBeNull();
    expect(toISODate("2026/08")).toBeNull();
    expect(toISODate(12345)).toBeNull();
  });
});

describe("parseContainers", () => {
  it("pulls the fields we store", () => {
    const rows = parseContainers(envelope([{
      containerID: 46887,
      performanceDateFormatted: "2026/08/16",
      venueName: "Grand Theatre at Grand Sierra Resort",
      venueCity: "Reno",
      venueState: "NV",
    }]));
    expect(rows).toEqual([{
      containerId: 46887,
      performanceDate: "2026-08-16",
      venueName: "Grand Theatre at Grand Sierra Resort",
      venueCity: "Reno",
      venueState: "NV",
      hasVideo: false,
    }]);
  });

  it("marks video when asked", () => {
    const rows = parseContainers(
      envelope([{ containerID: 46883, performanceDateFormatted: "2026/07/04" }]),
      { hasVideo: true });
    expect(rows[0].hasVideo).toBe(true);
    expect(rows[0].venueName).toBeNull();
  });

  // Real catalog rows carry an empty performanceDateFormatted. Date is the join
  // key, so a row without one cannot be matched to anything and is dropped.
  it("drops rows with no usable date", () => {
    expect(parseContainers(envelope([
      { containerID: 1, performanceDateFormatted: "" },
      { containerID: 2, performanceDateFormatted: "2026/07/04" },
    ]))).toHaveLength(1);
  });

  it("drops rows with no container id", () => {
    expect(parseContainers(envelope([
      { performanceDateFormatted: "2026/07/04" },
    ]))).toEqual([]);
  });

  it("returns empty for a shape it doesn't recognise instead of throwing", () => {
    expect(parseContainers({})).toEqual([]);
    expect(parseContainers(null)).toEqual([]);
    expect(parseContainers({ Response: {} })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/nugs-catalog/parse.test.ts`
Expected: FAIL — cannot resolve `./parse`.

- [ ] **Step 3: Implement**

Create `lib/nugs-catalog/parse.ts`:

```ts
/** Pure parsing of nugs's `catalog.containersAll` payload. No network, no db.
 *  Probed 2026-08-18: the endpoint answers unauthenticated and returns
 *  `{ Response: { containers: [...] } }`. */

export type NugsContainer = {
  containerId: number;
  performanceDate: string;   // "YYYY-MM-DD"
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
  hasVideo: boolean;
};

/** The API formats dates as "2026/08/16". Returns null for anything that isn't
 *  three slash-separated numeric parts — real rows do carry empty dates. */
export function toISODate(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

export function parseContainers(json: unknown, opts: { hasVideo?: boolean } = {}): NugsContainer[] {
  const containers = (json as { Response?: { containers?: unknown } } | null)
    ?.Response?.containers;
  if (!Array.isArray(containers)) return [];

  const out: NugsContainer[] = [];
  for (const raw of containers) {
    const c = raw as Record<string, unknown>;
    const containerId = typeof c.containerID === "number" ? c.containerID : null;
    const performanceDate = toISODate(c.performanceDateFormatted);
    if (containerId == null || performanceDate == null) continue;
    out.push({
      containerId,
      performanceDate,
      venueName: str(c.venueName),
      venueCity: str(c.venueCity),
      venueState: str(c.venueState),
      hasVideo: opts.hasVideo === true,
    });
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/nugs-catalog/parse.test.ts && npm run typecheck`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/nugs-catalog/parse.ts lib/nugs-catalog/parse.test.ts
git commit -m "feat(nugs): parse the catalog payload into container rows"
```

---

### Task 4: Match a container to a show

**Files:**
- Create: `lib/nugs-catalog/match.ts`
- Test: `lib/nugs-catalog/match.test.ts`

**Interfaces:**
- Consumes: `NugsContainer` from `./parse`.
- Produces:
  - `normalizeVenue(s: string | null | undefined): string`
  - `venueMatches(a: string | null | undefined, b: string | null | undefined): boolean`
  - `resolveContainer(show: { date: string; venue: string | null }, candidates: NugsContainer[]): NugsContainer | null`

- [ ] **Step 1: Write the failing test**

Create `lib/nugs-catalog/match.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normalizeVenue, venueMatches, resolveContainer } from "./match";
import type { NugsContainer } from "./parse";

const c = (containerId: number, performanceDate: string, venueName: string | null): NugsContainer =>
  ({ containerId, performanceDate, venueName, venueCity: null, venueState: null, hasVideo: false });

describe("normalizeVenue", () => {
  it("folds case, accents and punctuation", () => {
    expect(normalizeVenue("The Salt Shed")).toBe("the salt shed");
    expect(normalizeVenue("Théâtre  St-Denis!")).toBe("theatre st denis");
    expect(normalizeVenue(null)).toBe("");
  });
});

describe("venueMatches", () => {
  it("matches in either direction — a hint may be shorter or longer", () => {
    expect(venueMatches("Salt Shed", "The Salt Shed, Chicago")).toBe(true);
    expect(venueMatches("The Salt Shed, Chicago", "Salt Shed")).toBe(true);
  });
  it("does not match different venues", () => {
    expect(venueMatches("Red Rocks", "The Salt Shed")).toBe(false);
  });
  it("an absent side never matches", () => {
    expect(venueMatches(null, "The Salt Shed")).toBe(false);
    expect(venueMatches("The Salt Shed", null)).toBe(false);
    expect(venueMatches("", "")).toBe(false);
  });
});

describe("resolveContainer", () => {
  it("returns null when nothing shares the date", () => {
    expect(resolveContainer({ date: "2024-04-20", venue: "The Salt Shed" },
      [c(1, "2024-04-21", "The Salt Shed")])).toBeNull();
  });

  it("takes the only container on that date, venue or not", () => {
    expect(resolveContainer({ date: "2024-04-20", venue: "Somewhere Else" },
      [c(1, "2024-04-20", "The Salt Shed")])?.containerId).toBe(1);
    expect(resolveContainer({ date: "2024-04-20", venue: null },
      [c(1, "2024-04-20", "The Salt Shed")])?.containerId).toBe(1);
  });

  // Real same-date pairs as of 2026-08-18: 2022-07-22, 2025-05-10, 2026-05-09.
  it("breaks a two-show day on the venue", () => {
    const day = [c(1, "2025-05-10", "Hollywood Bowl"), c(2, "2025-05-10", "The Greek Theatre")];
    expect(resolveContainer({ date: "2025-05-10", venue: "Greek Theatre" }, day)?.containerId).toBe(2);
    expect(resolveContainer({ date: "2025-05-10", venue: "Hollywood Bowl" }, day)?.containerId).toBe(1);
  });

  it("leaves a two-show day unmatched when the venue can't break it", () => {
    const day = [c(1, "2022-07-22", "Petersen Events Center"), c(2, "2022-07-22", "Stage AE")];
    expect(resolveContainer({ date: "2022-07-22", venue: null }, day)).toBeNull();
    expect(resolveContainer({ date: "2022-07-22", venue: "Somewhere Else" }, day)).toBeNull();
  });

  it("leaves it unmatched when the venue matches more than one candidate", () => {
    const day = [c(1, "2026-05-09", "The Capitol Theatre"), c(2, "2026-05-09", "Capitol Theatre")];
    expect(resolveContainer({ date: "2026-05-09", venue: "Capitol Theatre" }, day)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/nugs-catalog/match.test.ts`
Expected: FAIL — cannot resolve `./match`.

- [ ] **Step 3: Implement**

Create `lib/nugs-catalog/match.ts`:

```ts
import type { NugsContainer } from "./parse";

/** Lowercased, accent-folded, punctuation-stripped. Mirrors DeepLinkMatch.normalize
 *  in tsvb/applenugs so the site and the app break ties the same way. */
export function normalizeVenue(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip combining marks left by NFD
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Bidirectional containment: "Salt Shed" should match "The Salt Shed, Chicago"
 *  and the reverse. An absent or empty side never matches. */
export function venueMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeVenue(a), nb = normalizeVenue(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

/** The container for one show, or null.
 *
 *  Date is the join key. A single container on the date wins outright — the venue
 *  is a tie-breaker, not a verifier, because our venue spelling and nugs's differ
 *  more often than two shows share a date.
 *
 *  Ambiguity resolves to null on purpose: an unmatched show falls back to the
 *  artist+date search, which is the behaviour that shipped before this feature.
 *  Guessing would send someone to the wrong night, which is worse than a search. */
export function resolveContainer(
  show: { date: string; venue: string | null },
  candidates: NugsContainer[],
): NugsContainer | null {
  const sameDate = candidates.filter((c) => c.performanceDate === show.date);
  if (sameDate.length === 0) return null;
  if (sameDate.length === 1) return sameDate[0];

  const byVenue = sameDate.filter((c) => venueMatches(show.venue, c.venueName));
  return byVenue.length === 1 ? byVenue[0] : null;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/nugs-catalog/match.test.ts && npm run typecheck`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/nugs-catalog/match.ts lib/nugs-catalog/match.test.ts
git commit -m "feat(nugs): match containers to shows by date, venue breaking ties"
```

---

### Task 5: Catalog client and paging

**Files:**
- Create: `lib/nugs-catalog/client.ts`
- Test: `lib/nugs-catalog/client.test.ts`

**Interfaces:**
- Consumes: `parseContainers`, `NugsContainer` from `./parse`.
- Produces:
  - `type NugsCatalogClient = { fetchAllContainers(): Promise<NugsContainer[]> }`
  - `createNugsCatalogClient(opts?: { artistId?: number; baseUrl?: string; userAgent?: string; fetchImpl?: typeof fetch; pageSize?: number }): NugsCatalogClient`

- [ ] **Step 1: Write the failing test**

Create `lib/nugs-catalog/client.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createNugsCatalogClient } from "./client";

/** A fake fetch that serves pages from a map of offset -> containers, per list.
 *  `videoReleaseType=6` in the query selects the video list. */
function fakeFetch(audio: unknown[][], video: unknown[][]) {
  const calls: string[] = [];
  const impl = async (url: string | URL) => {
    const u = String(url);
    calls.push(u);
    const isVideo = u.includes("videoReleaseType=6");
    const offset = Number(new URL(u).searchParams.get("startOffset"));
    const pages = isVideo ? video : audio;
    const page = pages[Math.floor((offset - 1) / 2)] ?? [];
    return { ok: true, status: 200, json: async () => ({ Response: { containers: page } }) } as Response;
  };
  return { impl: impl as unknown as typeof fetch, calls };
}

const row = (id: number, date: string) => ({ containerID: id, performanceDateFormatted: date });

describe("createNugsCatalogClient", () => {
  it("pages until a short page and merges both lists", async () => {
    const { impl, calls } = fakeFetch(
      [[row(1, "2026/01/01"), row(2, "2026/01/02")], [row(3, "2026/01/03")]],
      [[row(2, "2026/01/02")]],
    );
    const client = createNugsCatalogClient({ fetchImpl: impl, pageSize: 2 });
    const rows = await client.fetchAllContainers();

    expect(rows.map((r) => r.containerId).sort()).toEqual([1, 2, 3]);
    // The video list marks container 2, and only container 2.
    expect(rows.find((r) => r.containerId === 2)!.hasVideo).toBe(true);
    expect(rows.find((r) => r.containerId === 1)!.hasVideo).toBe(false);
    // Two audio requests (full page then short page) + one video request.
    expect(calls).toHaveLength(3);
  });

  it("stops at the first empty page", async () => {
    const { impl, calls } = fakeFetch([[]], [[]]);
    const client = createNugsCatalogClient({ fetchImpl: impl, pageSize: 2 });
    expect(await client.fetchAllContainers()).toEqual([]);
    expect(calls).toHaveLength(2);
  });

  it("throws on a non-ok response rather than returning a partial catalog", async () => {
    const impl = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    const client = createNugsCatalogClient({ fetchImpl: impl });
    await expect(client.fetchAllContainers()).rejects.toThrow(/503/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/nugs-catalog/client.test.ts`
Expected: FAIL — cannot resolve `./client`.

- [ ] **Step 3: Implement**

Create `lib/nugs-catalog/client.ts`:

```ts
import { parseContainers, type NugsContainer } from "./parse";

/** nugs's legacy catalog host. Probed 2026-08-18: `catalog.containersAll` answers
 *  with no Authorization header at all. Goose is artistID 1205. */
const DEFAULT_BASE = "https://streamapi.nugs.net/api.aspx";
const DEFAULT_UA = "GooseIndex/0.1 (goose index fan project)";
const GOOSE_ARTIST_ID = 1205;
const DEFAULT_PAGE_SIZE = 100;   // limit > 100 returns HTTP 400

export interface NugsCatalogClientOptions {
  artistId?: number;
  baseUrl?: string;
  userAgent?: string;
  fetchImpl?: typeof fetch;
  pageSize?: number;
}

export type NugsCatalogClient = {
  fetchAllContainers(): Promise<NugsContainer[]>;
};

export function createNugsCatalogClient(opts: NugsCatalogClientOptions = {}): NugsCatalogClient {
  const artistId = opts.artistId ?? GOOSE_ARTIST_ID;
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE;
  const userAgent = opts.userAgent ?? DEFAULT_UA;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;

  function url(offset: number, videoOnly: boolean): string {
    const params: Record<string, string> = {
      method: "catalog.containersAll",
      artistList: String(artistId),
      startOffset: String(offset),
      limit: String(pageSize),
      availType: "1",
      vdisp: "1",
    };
    if (videoOnly) params.videoReleaseType = "6";
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `${baseUrl}?${qs}`;
  }

  /** Page one list until a short page. `startOffset` is 1-based. */
  async function fetchList(videoOnly: boolean): Promise<NugsContainer[]> {
    const all: NugsContainer[] = [];
    for (let offset = 1; ; offset += pageSize) {
      const res = await fetchImpl(url(offset, videoOnly), { headers: { "User-Agent": userAgent } });
      if (!res.ok) throw new Error(`nugs catalog HTTP ${res.status} at offset ${offset}`);
      const page = parseContainers(await res.json(), { hasVideo: videoOnly });
      all.push(...page);
      if (page.length < pageSize) break;
    }
    return all;
  }

  return {
    /** The full catalog. The video list is a filtered view of the same containers
     *  (probed 2026-08-18: every video ID is also an audio ID), so it is folded in
     *  as a flag rather than kept as separate rows. */
    async fetchAllContainers(): Promise<NugsContainer[]> {
      const audio = await fetchList(false);
      const video = await fetchList(true);
      const videoIds = new Set(video.map((c) => c.containerId));

      const byId = new Map<number, NugsContainer>();
      for (const c of audio) byId.set(c.containerId, { ...c, hasVideo: videoIds.has(c.containerId) });
      // A video container that never appeared in the audio list would be dropped
      // otherwise. None exist today; this keeps a future one from vanishing.
      for (const c of video) if (!byId.has(c.containerId)) byId.set(c.containerId, c);

      return [...byId.values()];
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/nugs-catalog/client.test.ts && npm run typecheck`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/nugs-catalog/client.ts lib/nugs-catalog/client.test.ts
git commit -m "feat(nugs): page the catalog and fold the video list into a flag"
```

---

### Task 6: Import runner and script

**Files:**
- Create: `lib/nugs-catalog/run.ts`
- Create: `lib/nugs-catalog/run.test.ts`
- Create: `scripts/import-nugs.ts`
- Modify: `package.json` (scripts block)

**Interfaces:**
- Consumes: `NugsCatalogClient` from `./client`, `resolveContainer` from `./match`, `NugsContainer` from `./parse`, `AppDb` from `db/schema`.
- Produces:
  - `type NugsImportSummary = { fetched: number; stored: number; matched: number; unmatched: number; dryRun: boolean }`
  - `runNugsImport(deps: { client: NugsCatalogClient; db: AppDb; now?: Date; dryRun?: boolean }): Promise<NugsImportSummary>`

- [ ] **Step 1: Write the failing test**

Create `lib/nugs-catalog/run.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { makeTestDb } from "../../db/testing";
import * as schema from "../../db/schema";
import { runNugsImport } from "./run";
import type { NugsContainer } from "./parse";

const ctx = await makeTestDb();
afterAll(() => ctx.close());

const container = (
  containerId: number, performanceDate: string, venueName: string | null, hasVideo = false,
): NugsContainer => ({ containerId, performanceDate, venueName, venueCity: null, venueState: null, hasVideo });

const clientOf = (rows: NugsContainer[]) => ({ fetchAllContainers: async () => rows });

async function seedShow(showId: number, showDate: string, venueName: string | null) {
  if (venueName) {
    await ctx.db.insert(schema.venues).values({ venueId: showId, name: venueName }).onConflictDoNothing();
  }
  await ctx.db.insert(schema.shows).values({
    showId, showDate, artistId: 1205, venueId: venueName ? showId : null,
  });
}

beforeEach(async () => {
  await ctx.db.execute(sql`delete from shows`);
  await ctx.db.execute(sql`delete from venues`);
  await ctx.db.execute(sql`delete from nugs_containers`);
  await ctx.db.insert(schema.artists).values({ artistId: 1205, name: "Goose" }).onConflictDoNothing();
});

describe("runNugsImport", () => {
  it("stores containers and resolves them onto shows", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed, Chicago");
    const summary = await runNugsImport({
      client: clientOf([container(46887, "2024-04-20", "The Salt Shed", true)]),
      db: ctx.db,
    });

    expect(summary).toMatchObject({ fetched: 1, stored: 1, matched: 1, unmatched: 0, dryRun: false });
    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId, video: schema.shows.nugsHasVideo })
      .from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row).toEqual({ id: 46887, video: true });
  });

  it("leaves an unresolvable two-show day null", async () => {
    await seedShow(1, "2022-07-22", null);
    const summary = await runNugsImport({
      client: clientOf([
        container(10, "2022-07-22", "Stage AE"),
        container(11, "2022-07-22", "Petersen Events Center"),
      ]),
      db: ctx.db,
    });

    expect(summary.matched).toBe(0);
    expect(summary.unmatched).toBe(1);
    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row.id).toBeNull();
  });

  it("is idempotent and updates a container that changed", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    await runNugsImport({ client: clientOf([container(46887, "2024-04-20", "Old Name")]), db: ctx.db });
    await runNugsImport({ client: clientOf([container(46887, "2024-04-20", "The Salt Shed", true)]), db: ctx.db });

    const rows = await ctx.db.select().from(schema.nugsContainers);
    expect(rows).toHaveLength(1);
    expect(rows[0].venueName).toBe("The Salt Shed");
    expect(rows[0].hasVideo).toBe(true);
  });

  it("clears a stale resolution when the container is gone from the catalog", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    await runNugsImport({ client: clientOf([container(46887, "2024-04-20", "The Salt Shed")]), db: ctx.db });
    await runNugsImport({ client: clientOf([container(1, "2019-01-01", "Elsewhere")]), db: ctx.db });

    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row.id).toBeNull();
  });

  it("writes nothing on a dry run", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    const summary = await runNugsImport({
      client: clientOf([container(46887, "2024-04-20", "The Salt Shed")]),
      db: ctx.db, dryRun: true,
    });

    expect(summary).toMatchObject({ matched: 1, dryRun: true });
    expect(await ctx.db.select().from(schema.nugsContainers)).toEqual([]);
    const [row] = await ctx.db
      .select({ id: schema.shows.nugsContainerId }).from(schema.shows).where(sql`${schema.shows.showId} = 1`);
    expect(row.id).toBeNull();
  });

  it("writes nothing when the fetch fails", async () => {
    await seedShow(1, "2024-04-20", "The Salt Shed");
    const failing = { fetchAllContainers: async () => { throw new Error("HTTP 503"); } };
    await expect(runNugsImport({ client: failing, db: ctx.db })).rejects.toThrow(/503/);
    expect(await ctx.db.select().from(schema.nugsContainers)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/nugs-catalog/run.test.ts`
Expected: FAIL — cannot resolve `./run`.

- [ ] **Step 3: Implement the runner**

Create `lib/nugs-catalog/run.ts`:

```ts
import { eq, sql } from "drizzle-orm";
import type { AppDb } from "../../db/schema";
import { nugsContainers, shows, venues } from "../../db/schema";
import type { NugsCatalogClient } from "./client";
import { resolveContainer } from "./match";

export type NugsImportSummary = {
  fetched: number;
  stored: number;
  matched: number;
  unmatched: number;
  dryRun: boolean;
};

/** Fetch the whole catalog, store it, then resolve one container per show.
 *
 *  The fetch completes before anything is written, so a failed or partial fetch
 *  throws with the previous data untouched — a nugs outage must not blank the
 *  table. Resolution is recomputed from scratch each run, which is also what
 *  clears a show whose container has left the catalog. */
export async function runNugsImport(deps: {
  client: NugsCatalogClient;
  db: AppDb;
  now?: Date;
  dryRun?: boolean;
}): Promise<NugsImportSummary> {
  const { client, db } = deps;
  const dryRun = deps.dryRun === true;
  const fetchedAt = deps.now ?? new Date();

  const containers = await client.fetchAllContainers();

  const showRows = await db
    .select({ showId: shows.showId, date: shows.showDate, venue: venues.name })
    .from(shows)
    .leftJoin(venues, eq(venues.venueId, shows.venueId));

  const resolutions = showRows.map((s) => ({
    showId: s.showId,
    container: resolveContainer({ date: s.date, venue: s.venue }, containers),
  }));
  const matched = resolutions.filter((r) => r.container != null).length;

  const summary: NugsImportSummary = {
    fetched: containers.length,
    stored: dryRun ? 0 : containers.length,
    matched,
    unmatched: resolutions.length - matched,
    dryRun,
  };
  if (dryRun) return summary;

  if (containers.length > 0) {
    await db.insert(nugsContainers)
      .values(containers.map((c) => ({ ...c, fetchedAt })))
      .onConflictDoUpdate({
        target: nugsContainers.containerId,
        set: {
          performanceDate: sql`excluded.performance_date`,
          venueName: sql`excluded.venue_name`,
          venueCity: sql`excluded.venue_city`,
          venueState: sql`excluded.venue_state`,
          hasVideo: sql`excluded.has_video`,
          fetchedAt: sql`excluded.fetched_at`,
        },
      });
  }

  // Recomputed every run, so a show that stops resolving is cleared.
  for (const r of resolutions) {
    await db.update(shows)
      .set({
        nugsContainerId: r.container?.containerId ?? null,
        nugsHasVideo: r.container?.hasVideo ?? null,
      })
      .where(eq(shows.showId, r.showId));
  }

  return summary;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/nugs-catalog/run.test.ts && npm run typecheck`
Expected: PASS, 6 tests.

- [ ] **Step 5: Add the script wrapper**

Create `scripts/import-nugs.ts`:

```ts
import "dotenv/config";
import { createNugsCatalogClient } from "../lib/nugs-catalog/client";
import { runNugsImport } from "../lib/nugs-catalog/run";
import { db, closeDb } from "../db/client";
import type { AppDb } from "../db/schema";
import { announceTarget } from "./target";

/**
 * Imports nugs's Goose catalog into `nugs_containers` and resolves one container
 * per show onto `shows.nugs_container_id`.
 *
 * `.env` DATABASE_URL is PRODUCTION. Trust the target line printed below.
 *
 * Usage:
 *   npm run import-nugs -- --dry-run
 *   npm run import-nugs
 */
announceTarget(process.env.DATABASE_URL ?? "");

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const ua = process.env.NUGS_USER_AGENT;
  const client = createNugsCatalogClient(ua ? { userAgent: ua } : {});
  const summary = await runNugsImport({ client, db: db as unknown as AppDb, dryRun });
  console.log("nugs import complete:", summary);
  await closeDb();
}

main().catch(async (e) => { console.error(e); await closeDb(); process.exit(1); });
```

Add to the `scripts` block in `package.json`, after `"import-albums"`:

```json
    "import-nugs": "tsx scripts/import-nugs.ts",
```

- [ ] **Step 6: Run it against the local database**

```bash
npm run db:up
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' npm run db:migrate
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' npm run import-nugs -- --dry-run
```

Expected: the target line names `localhost`, **not** a Neon host. The summary prints a `fetched` count in the high hundreds (490 on 2026-08-18) and `stored: 0`. If the target line names Neon, stop.

- [ ] **Step 7: Commit**

```bash
git add lib/nugs-catalog/run.ts lib/nugs-catalog/run.test.ts scripts/import-nugs.ts package.json
git commit -m "feat(nugs): import the catalog and resolve a container per show"
```

---

### Task 7: Expose the container to pages

**Files:**
- Modify: `lib/queries/shows.ts` (`ShowDetail` type and `getShowDetails`)
- Test: `lib/queries/shows.test.ts` (exists — append)

**Interfaces:**
- Consumes: `shows.nugsContainerId`, `shows.nugsHasVideo` from Task 2.
- Produces: `ShowDetail` gains `nugsContainerId: number | null` and `nugsHasVideo: boolean | null`.

**Why this test file:** `lib/queries/shows.ts` imports `db` from `@/db/client` as a module-level
singleton, so it cannot take an injected database. `lib/queries/shows.test.ts` already solves that
with a hoisted `vi.mock("@/db/client")` proxying to PGlite. Reuse that harness. Do not add a second
one, and do not put this in `db/repository.test.ts` — that file tests the upsert layer and never
calls `getShowDetails`.

- [ ] **Step 1: Write the failing test**

Append to `lib/queries/shows.test.ts`. Add `getShowDetails` to the existing import from `./shows`;
`upsertArtists`, `upsertVenues` and `upsertShows` are already imported at the top of that file.

```ts
describe("getShowDetails exposes the resolved nugs container", () => {
  beforeAll(async () => {
    await upsertArtists(ctx.db, [{ artistId: 1205, name: "Goose" }]);
    await upsertVenues(ctx.db, [{ venueId: 4600, name: "The Salt Shed", slug: "salt-shed",
      city: "Chicago", state: "IL", country: "USA", zip: null, capacity: null }]);
    await upsertShows(ctx.db, [
      { showId: 46000, showDate: "2024-04-20", artistId: 1205, venueId: 4600, tourId: null,
        title: null, permalink: null, showOrder: 1, notes: null, createdAt: null, updatedAt: null },
      { showId: 46001, showDate: "2024-04-21", artistId: 1205, venueId: 4600, tourId: null,
        title: null, permalink: null, showOrder: 1, notes: null, createdAt: null, updatedAt: null },
    ]);
    // Only the first of the two shows has been resolved to a container.
    await ctx.db.execute(
      sql`update shows set nugs_container_id = 46887, nugs_has_video = true where show_id = 46000`);
  });

  it("returns the stored container id and video flag", async () => {
    const [row] = await getShowDetails("2024-04-20");
    expect(row.nugsContainerId).toBe(46887);
    expect(row.nugsHasVideo).toBe(true);
  });

  it("is null for a show with no resolved container", async () => {
    const [row] = await getShowDetails("2024-04-21");
    expect(row.nugsContainerId).toBeNull();
    expect(row.nugsHasVideo).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/queries/shows.test.ts`
Expected: FAIL — `row.nugsContainerId` is `undefined`, because the column is not in the select.

- [ ] **Step 3: Implement**

In `lib/queries/shows.ts`, extend the `ShowDetail` type:

```ts
export type ShowDetail = ShowSummary & {
  venueId: number | null;
  permalink: string | null;
  notes: string | null;
  /** The band's own release of this night, when they've put one out. */
  bandcampUrl: string | null;
  /** The nugs container resolved for this night, or null when we couldn't
   *  resolve one. Null means "link to a search", never "not on nugs". */
  nugsContainerId: number | null;
  nugsHasVideo: boolean | null;
};
```

And add the two columns to the `getShowDetails` select, after `bandcampUrl`:

```ts
      nugsContainerId: shows.nugsContainerId,
      nugsHasVideo: shows.nugsHasVideo,
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run lib/queries/shows.test.ts && npm run typecheck`
Expected: PASS, including the file's pre-existing query tests.

- [ ] **Step 5: Commit**

```bash
git add lib/queries/shows.ts lib/queries/shows.test.ts
git commit -m "feat(nugs): expose the resolved container on ShowDetail"
```

---

### Task 8: The "Open on nugs.net" control

**Files:**
- Modify: `app/_components/show-header.tsx` (`ShowNugs` at ~line 39; three call sites at ~lines 93, 125, 179)
- Test: `app/_components/show-header.test.tsx` (exists — append)

**Interfaces:**
- Consumes: `nugsWebHref`, `nugsWebFallback` from `lib/nugs`; `ShowDetail.nugsContainerId` / `.nugsHasVideo` from Task 7.
- Produces: no new exports.

- [ ] **Step 1: Write the failing test**

Append to `app/_components/show-header.test.tsx`. The file already defines a `nugsShow` fixture — extend a copy of it rather than mutating the shared one:

```ts
describe("ShowHeader nugs.net control", () => {
  const withContainer = { ...nugsShow, nugsContainerId: 46887, nugsHasVideo: true } as ShowDetail;
  const withoutContainer = { ...nugsShow, nugsContainerId: null, nugsHasVideo: null } as ShowDetail;

  for (const experience of ["minimal", "functional", "fancy"] as const) {
    it(`${experience}: links the exact release when a container is known`, () => {
      const html = renderToStaticMarkup(
        <ShowHeader show={withContainer} date="2024-04-20" setlist={setlist} experience={experience} />);
      expect(html).toContain("https://play.nugs.net/release/46887");
    });

    it(`${experience}: omits the control when no container is known`, () => {
      const html = renderToStaticMarkup(
        <ShowHeader show={withoutContainer} date="2024-04-20" setlist={setlist} experience={experience} />);
      expect(html).not.toContain("play.nugs.net/release/");
    });
  }

  it("the Watch button falls back to the video route", () => {
    const html = renderToStaticMarkup(
      <ShowHeader show={withContainer} date="2024-04-20" setlist={setlist} experience="fancy" />);
    expect(html).toContain("https://play.nugs.net/watch/release/46887");
  });

  it("without a container the fallbacks stay the artist+date search", () => {
    const html = renderToStaticMarkup(
      <ShowHeader show={withoutContainer} date="2024-04-20" setlist={setlist} experience="fancy" />);
    expect(html).toContain("play.nugs.net/#/search?searchTerm=Goose%202024-04-20");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run app/_components/show-header.test.tsx`
Expected: FAIL — the rendered markup contains no `play.nugs.net/release/46887`.

- [ ] **Step 3: Implement**

In `app/_components/show-header.tsx`, add `nugsWebHref` to the existing import from `@/lib/nugs`, then replace `ShowNugs` with:

```tsx
function ShowNugs({
  date, venue, containerId, minimal = false,
}: {
  date: string; venue: string | null;
  containerId: number | null;
  minimal?: boolean;
}) {
  // With a resolved container the fallback is the show's own page; without one it
  // stays the artist+date search that shipped before this feature.
  const audioFallback = nugsWebFallback({ date, venue, containerId });
  const videoFallback = nugsWebFallback({ date, venue, containerId, media: "video" });

  if (minimal) {
    return (
      <>
        <NugsLink href={nugsShowHref({ date, venue })} fallback={audioFallback} className="nugs-show">listen on nugs</NugsLink>
        {" · "}
        <NugsLink href={nugsShowHref({ date, venue, media: "video" })} fallback={videoFallback} className="nugs-show watch">watch</NugsLink>
        {containerId != null && (
          <>
            {" · "}
            <a href={nugsWebHref({ containerId })} target="_blank" rel="noopener noreferrer">open on nugs.net</a>
          </>
        )}
      </>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <NugsLink href={nugsShowHref({ date, venue })} fallback={audioFallback} className="nugs-show" title="Play this show on nugs">▷ Listen on nugs</NugsLink>
      <NugsLink href={nugsShowHref({ date, venue, media: "video" })} fallback={videoFallback} className="nugs-show watch" title="Watch this show on nugs">▷ Watch</NugsLink>
      {containerId != null && (
        <a
          href={nugsWebHref({ containerId })}
          target="_blank"
          rel="noopener noreferrer"
          className="nugs-show"
          title="Open this show on nugs.net (sign-in required)"
        >↗ Open on nugs.net</a>
      )}
    </span>
  );
}
```

`nugsHasVideo` is deliberately **not** passed to this component. The Watch button renders for every
show today, and hiding it where nugs holds no video would be a behaviour change this spec doesn't
ask for. The column is still stored and exposed on `ShowDetail` — the explainer page will need it
to state coverage — but nothing here reads it, so nothing here takes it.

Update all three call sites:

```tsx
<ShowNugs date={date} venue={show.venue} containerId={show.nugsContainerId} minimal />
```

(line ~93, with `minimal`), and the same without `minimal` at lines ~125 and ~179.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run app/_components/show-header.test.tsx && npm run typecheck`
Expected: PASS, including the pre-existing `ShowHeader` tests.

- [ ] **Step 5: Run the whole suite**

Run: `npm run test && npm run typecheck`
Expected: all green. `nugs-link.test.tsx` must still pass untouched.

- [ ] **Step 6: Commit**

```bash
git add app/_components/show-header.tsx app/_components/show-header.test.tsx
git commit -m "feat(nugs): open the exact show on nugs.net from a show page"
```

---

### Task 9: Verify the parser against live data

The spec requires this explicitly. In `tsvb/applenugs`, fixtures are exactly how a silent drop of every free-video item reached main — fixtures encode what we already believe, so they cannot catch a field we misread.

**Files:**
- Create: `docs/superpowers/reports/2026-08-18-nugs-import-verification.md`

- [ ] **Step 0: Make sure the local database actually has shows**

Steps 3-5 compare resolved containers against shows, which says nothing if `shows` is empty.
A fresh local database is empty, so sync it first:

```bash
npm run db:up
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' npm run db:migrate
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' npm run sync
```

This pulls elgoose.net into the local database and takes a few minutes. Confirm it finished with
a non-zero show count before continuing. If `psql` is not installed, run the queries in the later
steps through `npx tsx` against `db/client` instead — the numbers matter, the tool does not.

- [ ] **Step 1: Dry-run the import against live nugs data**

```bash
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' npm run import-nugs -- --dry-run
```

Record the `fetched` count and today's date. On 2026-08-18 the catalog held 490 audio and 203 video containers; a `fetched` count far below that means paging stopped early.

- [ ] **Step 2: Run the import for real against the LOCAL database**

```bash
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' npm run import-nugs
```

Confirm the target line names `localhost`. Record `matched` and `unmatched`.

- [ ] **Step 3: Check the numbers against the database**

```bash
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' \
  psql "$DATABASE_URL" -c "
    select
      (select count(*) from nugs_containers)                            as containers,
      (select count(*) from nugs_containers where has_video)            as with_video,
      (select count(*) from shows where nugs_container_id is not null)  as resolved,
      (select count(*) from shows)                                      as shows;"
```

Sanity checks: `containers` is in the high hundreds; `with_video` is well below `containers`; `resolved` is at most `shows`; `resolved` is not zero.

- [ ] **Step 4: Spot-check three real URLs**

Pick three resolved shows spanning different years:

```bash
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' \
  psql "$DATABASE_URL" -c "
    select show_date, nugs_container_id
    from shows where nugs_container_id is not null
    order by show_date desc limit 3;"
```

For each, confirm `https://play.nugs.net/release/<id>` opens that show once signed in. **Do not enter credentials on behalf of anyone — this step is the maintainer's to run**, or to skip and mark as unverified.

- [ ] **Step 5: Check the known ambiguous dates**

```bash
DATABASE_URL='postgres://postgres:postgres@localhost:5432/goose' \
  psql "$DATABASE_URL" -c "
    select show_date, nugs_container_id from shows
    where show_date in ('2022-07-22','2025-05-10','2026-05-09') order by show_date;"
```

Expected: each row either resolves to a container whose venue genuinely matches, or is null. A row resolving to the *wrong* venue's container is a bug in `resolveContainer` — fix it and add the case to `match.test.ts`.

- [ ] **Step 6: Write the report and commit**

Record in `docs/superpowers/reports/2026-08-18-nugs-import-verification.md`: the date, the counts from steps 1–3, the three spot-checked URLs and their outcome (or that they were left to the maintainer), and the ambiguous-date results. State coverage as a fraction with its date attached — never as a bare number that will go stale.

```bash
git add docs/superpowers/reports/2026-08-18-nugs-import-verification.md
git commit -m "docs: verify the nugs import against live catalog data"
```

---

---

### Task 10: Run the import nightly

The spec requires the import to run beside the existing nightly job. That job is a GitHub Action,
`.github/workflows/sync.yml`, on `cron: "12 9 * * *"` — not a Vercel cron; `vercel.json` declares
no schedules.

**Files:**
- Modify: `.github/workflows/sync.yml`

- [ ] **Step 1: Add the import step**

Insert between the "Sync elgoose → database" step and "Verify integrity", so the import runs after
shows exist (it resolves against them) and before `verify` reports:

```yaml
      # nugs's catalog is a second source, independent of elgoose. Runs after the
      # show sync because it resolves containers against the shows just written.
      - name: Import nugs catalog → database
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          NUGS_USER_AGENT: "GooseIndex/1.0 (+https://github.com/tsvb/goose-index; nightly nugs import)"
        run: npm run import-nugs
```

- [ ] **Step 2: Check the workflow parses**

Run: `python3 -c "import yaml,sys; yaml.safe_load(open('.github/workflows/sync.yml')); print('ok')"`
Expected: `ok`.

Also confirm by eye that the new step sits inside the same `steps:` list, at the same indentation
as its neighbours, and that `timeout-minutes: 10` on the job still leaves room — the import is
about seven HTTP requests plus roughly 500 row updates. If the nightly run starts timing out,
raise the timeout rather than trimming the import.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/sync.yml
git commit -m "ci: import the nugs catalog on the nightly run"
```

- [ ] **Step 4: Trigger it once by hand**

The workflow has `workflow_dispatch`, so it can be run from the Actions tab. **This writes to
production** — it is the maintainer's call, not something to trigger unprompted. Ask before running
it, and afterwards confirm the step's summary line shows a sane `fetched`/`matched` pair.

## Not in this plan

- **The `/listen-links` explainer page** — [`2026-08-18-listen-links-page-design.md`](../specs/2026-08-18-listen-links-page-design.md), built after this.
- **Track-level web links** — play.nugs.net has no per-track route.
- **Any change to the `applenugs://` scheme or `NugsLink`'s timing.**

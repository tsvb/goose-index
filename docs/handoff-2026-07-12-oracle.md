# Handoff — Oracle analytics + Bandcamp pipeline

_Session date: 2026-07-12._

> **Historical snapshot — every task below is done.** Kept as a record of how the Oracle cut
> and the Bandcamp pipeline were built, and of the deploy incident that produced the current
> migrate-on-build setup. It is **not** a to-do list; nothing here is outstanding.
>
> Closed on 2026-07-13:
> - **Deploy hardening** — `vercel-build` now runs `db:migrate && next build`, gated to
>   production. See [`DEPLOY.md`](DEPLOY.md).
> - **Non-songs on The Shelf** — jams, bracketed segments and interstitials are filtered
>   by naming convention in `lib/queries/discoveries.ts`.
> - **The flat day-of-week chart** — re-cut as a dial reading deviation from the week's mean,
>   with spoke thickness carrying sample size.
> - **Coach's notes** — the pipeline is documented in [`SETUP.md`](SETUP.md); re-run it to
>   pick up new releases.
>
> For current state see [`../README.md`](../README.md) and [`DEPLOY.md`](DEPLOY.md).

## TL;DR (as of 2026-07-12)

The **Oracle** stats cut (`/stats/oracle`) was built, merged, and deployed. Prod Neon had the
migration applied and **447 shows of coach's-notes data** imported. `main` @ `d8be2d4`,
**420/420 tests**, `tsc --noEmit` clean.

The Oracle page has since been substantially redrawn — spools, a dial, VU meters and a J-card
in place of the original cards and bars — so the component descriptions below are historical.

## What shipped

A sixth stats cut alongside Most Played / Rarities / Most Overdue / Debuts / Set Stats.
Five sections, all server-rendered with the house SVG/token style (no Recharts, no
`lucide-react` — deliberately not added):

1. **Never miss a Sunday show?** — avg jams/show by day of week (`dow-bars.tsx`)
2. **Flow-state matrix** — top segued transitions (`transitions-list.tsx`)
3. **The shelf** — originals with the longest current gap (`the-shelf.tsx`)
4. **Deepest venues** — highest jam ratio, min 3 shows (`venue-depth.tsx`)
5. **From the coach's desk** — terminal-styled cards from bandcamp notes (`coachs-notes.tsx`)

### Files (all under `main`)

- `app/stats/oracle/page.tsx` — server page (fancy/functional + minimal branches), `force-dynamic`
- `app/stats/oracle/components/*.tsx` — the five section components + `page.test.tsx`
- `app/stats/_shell.tsx` — **extracted** `StatsShell`, `CutSwitcher`, `MinimalCutRow`,
  `MinimalNoteRow`, `songsSortHref` (previously inline in `[cut]/page.tsx`; both routes now share them)
- `lib/queries/discoveries.ts` — the five queries (`allRows()`/`num()`/`strOrNull()` pattern,
  numerics coerced at the boundary, nullable types honest)
- `db/schema.ts` + `drizzle/0002_oracle-analytics.sql` + `drizzle/meta/0002_*` — adds
  `bandcamp_album_id`, `bandcamp_url`, `coach_notes` (all nullable text) to `shows`
- `scripts/scrape_bandcamp.py` — full-catalog bandcamp scraper (stdlib only, resumable, cached)
- `scripts/import-bandcamp.ts` — reads `data/albums.jsonl`, upserts the 3 columns on matching shows
- `scripts/README-bandcamp.md` — pipeline doc
- `app/stats/cuts.ts` (added `oracle`), `app/stats/page.tsx` (hub card + line), `page.test.tsx`

### Key commits

`400a6c5` feat · `596ab22` review-pass fixes · `1804b2f` scrape+import pipeline ·
`d8be2d4` CLAUDE.md (tooling pref). The `84c1969`/`5420260`/`6bc9fc8`/`8ae84db` commits
are the now-removed TS backfill's debug iterations (superseded by the Python scraper).

## Production / ops state — READ THIS

- **DB is Neon; the web app only reads.** See `docs/DEPLOY.md`.
- **Prod `DATABASE_URL` is a Vercel _Sensitive_ var → `vercel env pull` returns it BLANK.**
  You cannot get the prod connection string from the CLI. Sources: the **Neon dashboard**
  (Vercel → Storage → Neon → connection string), or the GitHub repo secret `DATABASE_URL`
  used by `.github/workflows/sync.yml` (that one is the **unpooled** string).
- **Local `.env`'s `DATABASE_URL` is a _different_ database from prod.** Running
  `db:migrate` / `import-bandcamp` locally does **not** touch prod. To act on prod you must
  `export DATABASE_URL='<neon-string>'` explicitly first. (This bit us — see incident below.)
- **`/stats/oracle` is `force-dynamic`** — it re-queries on every request, so data changes
  show up without a redeploy.
- Prod already has migration `0002` applied and `updated=447` rows imported (2026-07-12).
  The 6 unmatched bandcamp releases are side-project livestreams ("Rick & Peter acoustic")
  + one 2019 festival not in `shows` — expected, no action.

## Incident on 2026-07-12 (so it isn't repeated)

Pushing the Oracle code auto-deployed to Vercel, but **`next build` does not run
migrations**, so prod Neon lacked the `coach_notes` column. `/stats/oracle`'s
`coachsNotes()` query threw `column "coach_notes" does not exist` → the route 500'd.
**Blast radius was only that one route** — every other prod query selects explicit columns
(verified: no bare `db.select().from(shows)` in non-test source), so adding columns to the
schema couldn't affect them. Fixed by manually migrating + importing against the prod Neon
string. `docs/DEPLOY.md` now has a "Schema changes" warning.

## Outstanding work

1. ~~**[Recommended] Harden the deploy so migrations can't lag the code again.**~~
   **✅ DONE (2026-07-12).** `package.json` gained
   `"vercel-build": "npm run db:migrate && next build"` and `scripts/migrate.ts` now sets
   `prepare: false` (needed against Neon's pooled endpoint). A bad migration now fails the
   deploy instead of shipping code against a stale schema.

   Two things the original note got wrong, worth recording:
   - The "alternative" — folding `db:migrate` into `sync.yml` — **was already in place**
     (added `55977df`, 2026-07-04, *before* the incident). It didn't help, and couldn't:
     the nightly Action applies migrations up to 24h **after** the code deploys. That lag
     *is* the bug. Build-time migration is what actually closes it.
   - Vercel's `DATABASE_URL` is scoped to **Preview *and* Production**, and previews read
     the **production** DB. An ungated `vercel-build` would let any pushed branch migrate
     prod pre-review, so `scripts/migrate.ts` exits early unless
     `VERCEL_ENV === "production"`. Consequence: a preview of a schema-changing branch 500s
     on the new route until merge — expected. The gate keys off `VERCEL` (unset
     off-platform), so local + Action runs are unchanged.

2. ~~**[Optional] The Shelf surfaces non-songs.**~~ **✅ DONE (2026-07-13).** elgoose tags
   improvised jams, bracketed ambient segments and interstitials as `is_original` songs, and
   with a limit of 10 they were pushing three real shelved originals off the list entirely.
   `lib/queries/discoveries.ts` now filters on the *naming conventions* (a name ending in
   "Jam", a bracketed name, "Interlude n") rather than a fixed denylist, so the nightly sync
   can add new ones without the exclusion going stale. Two stragglers that follow no
   convention are named in `SHELF_EXCLUDED_NAMES`.

3. ~~**[Optional] Day-of-week chart is visually flat.**~~ **✅ DONE (2026-07-13).** The flatness
   was real but the diagnosis was wrong: a from-zero bar chart spends all its ink on the part
   the days share. It's now a dial plotting each day's **deviation from the week's own mean**,
   which shows the variance honestly instead of hiding it — and reveals that Monday is by far
   the jammiest night while Sunday, the section's original namesake, is dead average.
   Spoke *thickness* carries sample size, because Monday's reading rests on far fewer shows
   than the weekend's and a chart that hides that is overclaiming.

4. **[Ongoing] Refreshing coach's notes as new shows post.** Re-run the pipeline — now
   documented in [`SETUP.md`](SETUP.md) — or fold it into the nightly Action. On macOS the
   Python scraper needs certs:
   `SSL_CERT_FILE=$(python3 -c 'import certifi;print(certifi.where())') npm run scrape-bandcamp`.

## Commands

```bash
# Dev / checks
npm install
npm run db:up            # local Postgres (docker), OR export a Neon DATABASE_URL
npm run dev              # http://localhost:3000/stats/oracle
npm test                 # 420/420
npm run typecheck        # clean

# Bandcamp pipeline (data/ is gitignored; data/albums.jsonl already exists locally from this session)
npm run scrape-bandcamp                          # ~10 min, resumable via data/cache/
npm run import-bandcamp -- data/albums.jsonl --dry-run
npm run import-bandcamp -- data/albums.jsonl

# Acting on PROD requires the Neon string explicitly (see ops notes):
export DATABASE_URL='postgresql://…neon…?sslmode=require'
npm run db:migrate && npm run import-bandcamp -- data/albums.jsonl
```

## Note for the local session

- Project preference is recorded in `CLAUDE.md`: **prefer `brew install` over `npm i -g`**
  for global CLI tools (the project's own `npm run` scripts are unaffected).
- To act on prod you'll need the user to provide the Neon connection string — it is not
  pullable from Vercel.
- Suggested first move: pick up **Outstanding #1** (deploy hardening) — it's small,
  self-contained, and closes the loop on the incident.

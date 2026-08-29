# Deployment

Goose Index runs as a **Next.js app on [Vercel](https://vercel.com)** reading from a
**managed Postgres database on [Supabase](https://supabase.com)** (project
`goose-index`, ref `bltqcsvbdlyyxmvzxozc`, us-east-1). The custom domain
(`gooseindex.com`) is ~$12/yr.

> The database lived on Neon until 2026-08-29, when the Neon integration's
> allowance ran out and took the site down. The dataset is fully rebuildable
> from its sources (elgoose.net, nugs, Bandcamp — see the Actions in step 5),
> so the move was: apply the schema to Supabase, repoint the connection
> strings, re-run the sync workflows.

```
 elgoose.net ──(nightly GitHub Action: npm run sync)──▶  Supabase Postgres  ◀──(reads)──  Vercel (Next.js)  ──▶  visitors
```

The web app only ever **reads**. Catalog queries are cached for an hour, so page loads
rarely open a database connection at all. All **writes** happen out of band via the sync
job, so page loads never depend on the elgoose API being up.

## Connection details that matter

- **Supabase gives you three ways in.** The app uses the **transaction-mode pooler**
  (Supavisor: host `aws-1-us-east-1.pooler.supabase.com`, port `6543`, user
  `postgres.<project-ref>`) — that's what serverless needs. `db/client.ts` and
  `scripts/migrate.ts` both set `prepare: false`, required in transaction mode —
  the migrate script needs it because the production build migrates over whatever
  connection string Vercel has, i.e. the pooled one.
- The **session-mode pooler** (same host, port `5432`) is the right string for the
  GitHub Actions (bulk jobs, happier off transaction pooling). The **direct**
  connection (`db.<project-ref>.supabase.co:5432`) is IPv6-only without a paid
  add-on, so IPv4-only environments — GitHub runners included — can't use it;
  stick to the pooler hosts.
- **Where the code finds the string:** `db/url.ts`. `DATABASE_URL` is canonical and
  always wins; `POSTGRES_URL` (what the Vercel ↔ Supabase integration injects) is
  the fallback, so a Vercel deployment wired through the integration needs no
  hand-set variable.
- **Free-tier projects pause after ~7 days without activity.** The nightly sync
  counts as activity, so in practice the project stays up; if it ever does pause,
  restore it from the Supabase dashboard. Unlike Neon there is no
  compute-billed-while-awake meter to protect — but the caching below still
  matters, because the free tier caps monthly egress.

What the app does to keep database traffic low:

- Catalog reads go through `lib/queries/cache.ts` (Next.js Data Cache, one-hour TTL,
  tag `catalog`). Hits never open a Postgres connection.
- A live-show pull busts only that date's tags, so the rest of the catalog stays cached
  while tonight's setlist updates.
- `postgres` closes idle sockets after 20s (`db/client.ts`), so a warm Vercel isolate
  cannot hold a connection open on its own.
- `/sitemap.xml` is ISR (hourly). `robots.ts` disallows `/api/` so crawlers skip the
  live-sync endpoint.

After the nightly Action writes, it POSTs `/api/revalidate` if `REVALIDATE_SECRET` is
set on both GitHub and Vercel; without the secret the cache expires on its own within
an hour. The endpoint answers `{ revalidated: true }` only when the tag actually
dropped — 501 when it's unconfigured, 500 when Next refused — and the Action turns a
non-200 into a **warning, never a failed run**: the data work is already committed by
then, and the cost of a missed bust is at most an hour of staleness.

### Settings that still matter

- **RLS is enabled on every `public` table, with no policies — on purpose.** Supabase
  also exposes `public` tables over its REST API (PostgREST) with the anon key, and
  the default grants would allow full read *and write* there. The app never uses that
  API — it connects over the Postgres protocol as the table owner, which RLS does not
  restrict — so deny-by-default RLS closes the REST surface at zero cost. The
  Supabase advisor flags "RLS enabled, no policy" as INFO; that's the intended state.
  **A future migration that creates a table must also enable RLS on it.**
- **Preview deployments share the production database.** Visiting a preview URL reads
  prod (fine — reads are cheap and cached), and that's why previews never migrate
  (see "Schema changes" below).
- **Know what your local `.env` points at before you connect.** It moves, so no doc —
  this one included — can tell you where it points today. `npm run db:migrate`,
  `npm run sync` and every `import-*` script print their target host before they touch
  anything; trust that line. `npm run dev` prints nothing, so read `.env` yourself
  before pointing a dev server anywhere.

---

## One-time setup

### 1. GitHub repo — ✅ done

Public repo at `https://github.com/tsvb/goose-index`, `main` pushed.

### 2. Create the Supabase project — ✅ done (2026-08-29)

Project `goose-index` in org `wwamqahanwzxrfjvplfi`, us-east-1, Postgres 17. The
connection strings live under **Project → Connect** in the Supabase dashboard; the
database password is the one set at project creation (resettable under
**Project Settings → Database** if lost).

### 3. Schema and data — schema ✅ applied (2026-08-29), data via step 5

The schema (drizzle migrations 0000–0004) was applied via the Supabase management
API, and drizzle's journal (`drizzle.__drizzle_migrations`) was seeded with the same
five entries a local `npm run db:migrate` writes — so migrate runs against Supabase
are no-ops until a *new* migration lands. RLS was enabled on all tables (see above).

The **data** is not copied from Neon; it's rebuilt from source by the Actions in
step 5. To load it, run (from the repo's Actions tab):

1. **Sync Goose data** — elgoose catalog + verify + nugs. Daily anyway.
2. **Bandcamp discography** with **full** checked — albums, tracks, coach's notes.
   Monthly anyway, but only incremental unless "full" is set, so the one full run
   after the move matters.

(Running locally works too: `DATABASE_URL='<session-pooler-url>' npm run sync`, etc.)

### 4. Create the Vercel project — ✅ done

The Vercel project is named `gooseindex`, live at `https://www.gooseindex.com`.
Environment variables:

| Name | Value |
|------|-------|
| `DATABASE_URL` | the **transaction-mode pooler** string (port 6543) — or leave unset and let the Supabase integration's injected `POSTGRES_URL` serve via the `db/url.ts` fallback |
| `ELGOOSE_USER_AGENT` | _(optional)_ `GooseIndex/1.0 (+https://github.com/tsvb/goose-index)` |
| `REVALIDATE_SECRET` | a random string; same value as the GitHub secret in step 5. Lets the nightly Action drop the query cache. The site works without it (cache lasts ≤1h). |

If a hand-set `DATABASE_URL` still holds the old Neon string, **delete or replace
it** — it wins over `POSTGRES_URL` by design.

### Web Analytics — ✅ enabled

`<Analytics />` (`@vercel/analytics`) renders from `app/layout.tsx`, so it covers all three
editions, including 1.0. It is cookieless and needs no consent banner. Vercel serves the
script from a **randomised path** (e.g. `/ae9a…/script.js`) to survive ad-blockers, so don't
expect to find the strings `insights` or `analytics` in the page source — check for
`window.va` instead.

### 5. Nightly data refresh (GitHub Action)

A scheduled workflow (`.github/workflows/sync.yml`) re-runs `npm run sync` + `npm run verify`
against the database every day so the live site stays current without any server staying up
(a monthly `bandcamp.yml` does the same for the discography). Both read the connection
string from a repo secret — set it to the **session-mode pooler** string (port 5432;
the direct host is IPv6-only and GitHub runners are IPv4):

```bash
gh secret set DATABASE_URL --repo tsvb/goose-index --body '<supabase-session-pooler-url>'
gh secret set REVALIDATE_SECRET --repo tsvb/goose-index --body '<same random string as Vercel>'
```

Each workflow also has a **Run workflow** button (manual trigger) on the repo's Actions tab.

### 6. Custom domain — ✅ done

`gooseindex.com` is live. In Vercel (**Project → Settings → Domains**) the **primary domain
is `https://www.gooseindex.com`** — the apex 307-redirects to `www`. HTTPS is automatic.
The canonical origin is the `SITE_URL` constant in `lib/site.ts`; `app/sitemap.ts` and
`app/robots.ts` build every URL from it, so if the domain ever changes, change it there too.

---

## Redeploying / updating the site

- **Code changes:** push to `main` → Vercel auto-deploys.
- **Data only:** the nightly Action handles it; to refresh immediately, click **Run workflow**
  on the Actions tab (or run the sync locally against the pooler string).
- **Schema changes:** handled automatically. The `vercel-build` script in `package.json`
  runs `npm run db:migrate && next build`, so a **production** deploy migrates the database
  immediately before the new code goes live — the schema can no longer lag the code.
  Two consequences worth knowing:
  - **A bad migration now fails the build** instead of shipping code against a stale
    schema. That is the intended trade-off: no deploy beats a half-broken one.
  - **Preview deploys deliberately skip migrations.** Previews share the *production*
    database, so letting them migrate would mean any pushed branch could alter the prod
    schema before review. `scripts/migrate-gate.ts` decides this (`shouldSkipMigrations`,
    covered by `migrate-gate.test.ts`): on Vercel it fails closed, migrating only when
    `VERCEL_ENV === "production"`. A preview of a schema-changing branch will therefore 500
    on the new route until it merges — that's expected, not a regression.

  The gate keys off `VERCEL`, which is unset off-platform, so local runs and the nightly
  Action (which also migrates, see step 5) are unaffected and still work as before:
  ```bash
  DATABASE_URL='<supabase-url>' npm run db:migrate
  ```
  (Before this was wired up, the Oracle `coach_notes` columns shipped ahead of their
  migration and 500'd the route — see `docs/handoff-2026-07-12-oracle.md`.)

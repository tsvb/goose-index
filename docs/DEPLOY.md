# Deployment

Goose Index runs as a **Next.js app on [Vercel](https://vercel.com)** reading from a
**managed Postgres database on [Neon](https://neon.tech)**. Both have free tiers that are
ample for a low-traffic fan site. Total cost to launch: **$0** (the custom domain,
`gooseindex.com`, is ~$12/yr).

```
 elgoose.net ──(nightly GitHub Action: npm run sync)──▶  Neon Postgres  ◀──(reads)──  Vercel (Next.js)  ──▶  visitors
```

The web app only ever **reads** from the database at request time. All **writes** happen out
of band via the sync job, so page loads stay fast and never depend on the elgoose API being up.

## Connection details that matter

- **Neon gives you two connection strings.** Use the **pooled** one (host contains
  `-pooler`) for the app's `DATABASE_URL` — it routes through PgBouncer, which is what
  serverless needs. `db/client.ts` and `scripts/migrate.ts` both set `prepare: false`,
  required for PgBouncer's transaction pooling — the migrate script needs it because the
  production build migrates over whatever `DATABASE_URL` Vercel has, i.e. the pooled string.
- The **direct** (non-pooled) string is only needed if a tool complains about pooling;
  migrations and sync work fine over the pooled string too.
- Neon free-tier databases **auto-suspend when idle**, so the first request after a quiet
  spell has a ~1s cold start. Fine for this site.

---

## One-time setup

### 1. GitHub repo — ✅ done

Public repo at `https://github.com/tsvb/goose-index`, `main` pushed.

### 2. Create the Neon database

1. Sign in at [neon.tech](https://neon.tech) (GitHub login is easiest).
2. **Create a project** (e.g. `goose-index`, region close to you).
3. Open **Connection Details** and copy the **pooled** connection string. It looks like:
   ```
   postgres://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```
   Hand this to Claude (or keep it handy) — it's used in steps 3, 4, and 5.

### 3. Migrate the schema and load the data into Neon

Run locally, pointing the scripts at Neon instead of local Postgres:

```bash
DATABASE_URL='<neon-pooled-url>' npm run db:migrate   # create the tables
DATABASE_URL='<neon-pooled-url>' npm run sync          # pull elgoose → Neon
DATABASE_URL='<neon-pooled-url>' npm run verify        # expect: VERIFY OK
```

### 4. Create the Vercel project

1. Sign in at [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project**, import **`tsvb/goose-index`**. Framework auto-detects as Next.js.
3. Before the first deploy, add **Environment Variables**:
   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | the **pooled** Neon string from step 2 |
   | `ELGOOSE_USER_AGENT` | _(optional)_ `GooseIndex/1.0 (+https://github.com/tsvb/goose-index)` |
4. **Deploy.** The Vercel project is named `gooseindex` (renamed from `goose-almanac`), and the
   live site is `https://www.gooseindex.com` (step 6). The old
   `goose-almanac-*.vercel.app` alias is pinned to a pre-rename deployment — don't use it.

### 5. Nightly data refresh (GitHub Action)

A scheduled workflow (`.github/workflows/sync.yml`) re-runs `npm run sync` + `npm run verify`
against the database every day so the live site stays current without any server staying up.
It reads the connection string from a repo secret — set to the **unpooled** (direct) Neon
string, since a bulk job is happiest off PgBouncer:

```bash
gh secret set DATABASE_URL --repo tsvb/goose-index --body '<neon-UNPOOLED-url>'
```

The workflow also has a **Run workflow** button (manual trigger) on the repo's Actions tab.

### 6. Custom domain — ✅ done

`gooseindex.com` is live. In Vercel (**Project → Settings → Domains**) the **primary domain
is `https://www.gooseindex.com`** — the apex 307-redirects to `www`. HTTPS is automatic.
The canonical origin is the `SITE_URL` constant in `lib/site.ts`; `app/sitemap.ts` and
`app/robots.ts` build every URL from it, so if the domain ever changes, change it there too.

---

## Redeploying / updating the site

- **Code changes:** push to `main` → Vercel auto-deploys.
- **Data only:** the nightly Action handles it; to refresh immediately, click **Run workflow**
  on the Actions tab (or re-run step 3 locally).
- **Schema changes:** handled automatically. The `vercel-build` script in `package.json`
  runs `npm run db:migrate && next build`, so a **production** deploy migrates Neon
  immediately before the new code goes live — the schema can no longer lag the code.
  Two consequences worth knowing:
  - **A bad migration now fails the build** instead of shipping code against a stale
    schema. That is the intended trade-off: no deploy beats a half-broken one.
  - **Preview deploys deliberately skip migrations.** Previews share the *production*
    database, so letting them migrate would mean any pushed branch could alter the prod
    schema before review. `scripts/migrate.ts` exits early when `VERCEL_ENV !== production`.
    A preview of a schema-changing branch will therefore 500 on the new route until it
    merges — that's expected, not a regression.

  The gate keys off `VERCEL`, which is unset off-platform, so local runs and the nightly
  Action (which also migrates, see step 5) are unaffected and still work as before:
  ```bash
  DATABASE_URL='<neon-url>' npm run db:migrate
  ```
  (Before this was wired up, the Oracle `coach_notes` columns shipped ahead of their
  migration and 500'd the route — see `docs/handoff-2026-07-12-oracle.md`.)

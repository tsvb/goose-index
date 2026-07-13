# Setup

## Prerequisites
- **Node 22+**
- **Docker** (for local Postgres) — or a native Postgres 16

## First run
1. `cp .env.example .env` and adjust if needed (defaults match `docker-compose.yml`).
2. `npm install`
3. `npm run db:up`        — start Postgres (docker compose)
4. `npm run db:migrate`   — create the tables
5. `npm run sync`         — pull Goose data from elgoose.net into Postgres
6. `npm run verify`       — confirm the data is correct
7. `npm run dev`          — start the app at http://localhost:3000

`sync` finishes by reporting what it wrote, and `verify` ends with `VERIFY OK`. The counts
climb as Goose plays more shows, so treat any number quoted in docs as a snapshot, not a
target — `verify` is what tells you the data is sound.

## Useful commands
- `npm test` — offline test suite (fixtures + in-memory PGlite; no network/DB needed)
- `npm run typecheck` — TypeScript strict check
- `npm run capture-fixtures` — refresh test fixtures from the live API
- `npm run db:down` — stop the database

## Coach's notes (optional)

The "From the coach's desk" section on `/stats/oracle` is the band's own liner notes, which
live on Bandcamp rather than in elgoose. They're loaded by a separate two-step pipeline, and
the site works fine without them — the section simply renders empty.

```bash
npm run scrape-bandcamp                              # ~10 min, resumable, caches to data/
npm run import-bandcamp -- data/albums.jsonl --dry-run
npm run import-bandcamp -- data/albums.jsonl
```

On macOS the scraper needs a certificate bundle:
`SSL_CERT_FILE=$(python3 -c 'import certifi;print(certifi.where())') npm run scrape-bandcamp`.

See [`scripts/README-bandcamp.md`](../scripts/README-bandcamp.md).

## Notes on the data source
- The spine is the keyless [elgoose.net v2 API](https://elgoose.net/api/docs.php).
- The bare list endpoints cap at **4000 rows**, so the sync requests a high `limit`
  to pull the full history. Some songs (legacy ids like "Foxy Lady") are referenced by
  setlists but absent from `songs.json`; the sync backfills these from the setlist rows.
- Requests send a descriptive `User-Agent` (configurable via `ELGOOSE_USER_AGENT`) —
  the API returns HTTP 403 to requests without one.

## Data attribution
Live-performance data is sourced from the community database at
[elgoose.net](https://elgoose.net). This is a non-commercial fan project; data is cached
locally and elgoose is credited prominently. See
[`docs/research/2026-06-26-data-landscape.md`](research/2026-06-26-data-landscape.md).

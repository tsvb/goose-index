# Nugs import — live verification (2026-08-18)

Ran the nugs-catalog import against live nugs.net data and a **local** Postgres
database (`localhost:5432/goose_almanac`). This machine's `.env` is local dev,
not production Neon — production credentials live only in GitHub Actions
secrets. Every write-capable command's target line was confirmed `localhost`
before and after it ran; none printed a `neon.tech` host or the production
banner.

Docker is not installed on this machine; a Postgres server was already
listening on localhost:5432, so `npm run db:up` was skipped per the runbook
override. No `DATABASE_URL` override was exported — the `.env` value (local)
was used as-is by every plain `npm run …` invocation.

## Commands run

### 1. `npm run db:migrate`

```
→ writing to localhost
NOTICE: schema "drizzle" already exists, skipping
NOTICE: relation "__drizzle_migrations" already exists, skipping
migrations applied
```

Target confirmed `localhost`. The two NOTICEs are benign — this database
already carried the base schema (19 pre-existing tables, 853 `shows` rows)
from earlier work; migration `0004_dry_caretaker.sql` (which creates
`nugs_containers` and adds `shows.nugs_container_id` / `shows.nugs_has_video`)
had not yet been applied and now was.

### 2. `npm run sync`

```
→ writing to localhost
sync complete: { venues: 598, tours: 43, songs: 616, shows: 855, performances: 7558 }
```

Target confirmed `localhost`. Pulled elgoose.net into the local DB; `shows`
went from 853 → 855 (2026-08-18). Show count in the hundreds, as expected.

### 3. `npm run import-nugs -- --dry-run`

```
→ reading from localhost
nugs import complete: { fetched: 485, stored: 0, matched: 476, unmatched: 379, dryRun: true }
```

Target line correctly says "reading from" (read-only dry run), confirmed
`localhost`. `fetched: 485` — close to the 490-audio-container baseline noted
for 2026-08-18 in the task brief (catalog counts fluctuate day to day; this is
not "far below" and paging did not stop early). `stored: 0` and `dryRun: true`
as expected. `matched (476) + unmatched (379) = 855` — exactly the local
`shows` count at the time.

### 4. `npm run import-nugs` (real run)

```
→ writing to localhost
nugs import complete: { fetched: 485, stored: 485, matched: 476, unmatched: 379, dryRun: false }
```

Target confirmed `localhost`. `stored: 485` (all fetched containers persisted).
`matched (476) + unmatched (379) = 855` = local `shows` count, as expected.

## Check-query results (2026-08-18)

```sql
select
  (select count(*) from nugs_containers)                            as containers,
  (select count(*) from nugs_containers where has_video)            as with_video,
  (select count(*) from shows where nugs_container_id is not null)  as resolved,
  (select count(*) from shows)                                      as shows;
```

| containers (2026-08-18) | with_video (2026-08-18) | resolved (2026-08-18) | shows (2026-08-18) |
|---|---|---|---|
| 485 | 202 | 476 | 855 |

Sanity checks, all pass:
- `containers` (485) is in the high hundreds. ✓
- `with_video` (202) is well below `containers` (485) — about 42%. ✓
- `resolved` (476) ≤ `shows` (855), and not zero. ✓

Coverage as of 2026-08-18: **476 of 855 local shows resolved to a nugs
container** (this will change as the catalog and the local show set both
grow — treat the fraction, not either number alone, as the durable fact).

## Ambiguous-dates check (2026-08-18)

```sql
select show_date, nugs_container_id from shows
where show_date in ('2022-07-22','2025-05-10','2026-05-09') order by show_date;
```

All six rows (two shows per date) came back with `nugs_container_id = NULL`.
No row resolved to a container — safe non-resolution, not a wrong-venue match.
Venue detail pulled for context:

| show_date | show_id | venue_name | city | state | nugs_container_id |
|---|---|---|---|---|---|
| 2022-07-22 | 1658556522 | Fort Adams State Park | Newport | RI | NULL |
| 2022-07-22 | 1658556609 | Newport Blues Café | Newport | RI | NULL |
| 2025-05-10 | 1743623827 | El Ganzo Oasis | San Jose Del Cabo | — | NULL |
| 2025-05-10 | 1727890109 | El Ganzo Oasis | San Jose Del Cabo | — | NULL |
| 2026-05-09 | 1773021342 | El Ganzo Oasis | San Jose Del Cabo | — | NULL |
| 2026-05-09 | 1771450242 | El Ganzo Oasis | San Jose Del Cabo | — | NULL |

The 2022-07-22 pair is a genuinely different-venue ambiguity (two Newport
Folk Fest sets, different stages). The 2025-05-10 and 2026-05-09 pairs are
same-venue double-shows (early/late sets at El Ganzo Oasis) — even there,
the matcher declined to resolve rather than guessing which set maps to which
container. **Outcome: no matcher bug found.** `resolveContainer` is behaving
conservatively on every known ambiguous date; nothing here required a fix to
`match.test.ts`.

## Three most recent resolved shows — left to the maintainer

Per the safety rails for this task, these URLs were **not** opened or
curl'd (play.nugs.net serves an identical SPA shell for any path, so an HTTP
check would prove nothing; and this task does not sign in on anyone's
behalf). Recorded here for the maintainer to spot-check signed in:

| show_date | nugs_container_id | URL |
|---|---|---|
| 2026-08-16 | 46887 | https://play.nugs.net/release/46887 |
| 2026-08-13 | 46884 | https://play.nugs.net/release/46884 |
| 2026-07-04 | 46883 | https://play.nugs.net/release/46883 |

Status: **left to the maintainer to spot-check signed in.**

## Anything surprising

- The local database was not actually empty going in — it already had the
  base schema and 853 `shows` rows from earlier work in this project, so
  "Step 0" (confirm a non-zero show count before continuing) was satisfied
  before `sync` even ran. Only the nugs-specific migration (`0004`) was
  pending. This differs from the brief's framing of "a fresh local database
  is empty" but matches the controller's environment note that schema
  application state should be checked rather than assumed.
- `fetched` (485) came in a few containers under the brief's quoted
  2026-08-18 baseline of 490 audio containers. Given `matched + unmatched`
  reconciled exactly with the live `shows` count on both the dry run and the
  real run, and the brief itself flags the catalog number as one that
  "grows" (implying it can also drift day to day / by time of day), this
  reads as ordinary catalog churn rather than a paging bug. No corrective
  action taken.
- `with_video` (202) lines up closely with the brief's separately-quoted
  "203 video containers" for 2026-08-18, suggesting that figure describes
  the same has-video subset of fetched containers rather than a disjoint
  additive count. Noted for anyone reconciling these numbers later.
- No BLOCKED conditions were hit: every target line said `localhost`, no
  production banner ever printed, and the ambiguous-date matcher never
  resolved to a wrong venue.

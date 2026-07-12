# Goose Bandcamp scrape → import pipeline

Two-step: a Python scraper that pulls every release from
`goosetheband.bandcamp.com` into `data/`, then a Node importer that writes the
`coach_notes`, `bandcamp_url`, and `bandcamp_album_id` columns on matching
`shows` rows.

The scraper is verified against the full catalog:
**507 releases / 464 live shows / 6,212 tracks / 5,714 setlist songs /
1,612 coach's-note footnotes.**

## Run it

```bash
npm run scrape-bandcamp                    # full run, ~10 min at the default delay
npm run scrape-bandcamp -- --limit 15      # smoke test
npm run scrape-bandcamp -- --live-only     # skip the 43 studio releases
npm run scrape-bandcamp -- --refresh       # ignore the cache, re-fetch everything

npm run import-bandcamp -- data/albums.jsonl              # upsert into shows
npm run import-bandcamp -- data/albums.jsonl --dry-run    # report without writing
```

The importer matches on `show_date`; multi-show days use the trailing `-N`
convention in the bandcamp slug (`…-uk-2` → `show_order = 2`) with a safe
fallback to the first show of the day when the slug carries no suffix.

No dependencies — stdlib only.

Every page is cached to `data/cache/`, so the run is **resumable**: kill it and restart
and it picks up where it left off. Re-parsing 507 cached albums takes about two seconds,
which is what makes iterating on the parser tolerable. Going forward you only pay for the
handful of new shows.

`warm_cache.py <seconds>` fetches in time-boxed chunks if you'd rather not hold a single
long-running process open.

## Outputs (`./data/`)

| File | What it is |
|---|---|
| `albums.jsonl` | One nested JSON object per album. The easiest thing to feed a Node import script. |
| `goose_bandcamp.sqlite` | The same data, already relational. Good for poking at before you commit to a schema. |
| `albums.csv` / `tracks.csv` / `setlist.csv` / `coach_notes.csv` | Flat tables for a bulk `COPY`. |
| `aliases.csv` | Bandcamp track title ≠ setlist name (`SOS` vs `Same Old Shenanigans`). See below. |
| `schema.sql` | Portable DDL for the four tables. |
| `types.ts` | TypeScript interfaces matching `albums.jsonl`. |
| `report.txt` | Coverage stats plus every row the parser wasn't confident about. Read this. |

`import.ts` is a Node/Postgres upsert keyed on `album_id` — safe to re-run after each new show.

## Data model

```
albums ──┬── tracks       (track_num, title, duration_sec)
         ├── setlist      (set_name, position, song, transition, footnotes, duration_sec)
         └── coach_notes  (marker, note)
```

`setlist.footnotes` holds the `[n]` markers that reference `coach_notes.marker` for the
same album — that's the join that reattaches a note to the song it's about:

```sql
SELECT s.song, c.note
FROM setlist s
JOIN coach_notes c
  ON c.album_id = s.album_id
 AND ',' || s.footnotes || ',' LIKE '%,' || c.marker || ',%'
WHERE s.album_id = ?;
```

`transition` is `'segue'` (`>`), `'next'` (`,`), or `NULL` at a set close — so
`WHERE transition = 'segue'` gets you every jam that flowed into the next tune (1,718 of them).

Setlist songs are matched back to tracks in order to attach real durations. **99.5%
land cleanly** (5,687 / 5,714).

## Quirks worth knowing about

These are real inconsistencies in the source data that the parser now absorbs. If you ever
rewrite this, they're the things that will bite you:

- **Footnote markers are both `[1]` and `{1}`.** 257 shows use brackets, 144 use braces.
- **Segue arrows are `>`, `->`, *and* `→`** (U+2192). Miss the unicode one and songs silently merge.
- **Set headers are `Set 1:`, `Set:`, `Set One:`, `Set I:`, `Encore:`, and `E:`.** The bare
  `Set:` (single-set festival slots) accounts for 82 shows on its own.
- **Some song titles contain commas** — `One In, One Out`, `Don't Think Twice, It's Alright`.
  Naive comma-splitting shreds them, so the parser masks each album's own track titles before
  splitting.
- **Older shows (2018–19) put prose above the setlist**, and 11 live releases have no notes at all.
- **43 releases aren't shows** (Dripfield, Moon Cabin, etc.). They have no date in the title, so
  `is_live = false` catches them; use `--live-only` to drop them.

### `aliases.csv`

161 rows where the Bandcamp track title differs from the setlist name — `SOS` / `Same Old
Shenanigans`, `Wysteria` / `Wysteria Lane`, `Movin' Out` / `Movin' Out (Anthony's Song)`.
For a stats site this matters: unresolved, the same song counts as two. Skim it once, build a
canonical song table, and map through it. It's a one-time cleanup that pays off every show after.

## Being a good citizen

- Only `/music` and `/album/*` are touched. Both are permitted by Bandcamp's `robots.txt`,
  which disallows `/api/` — so this parses HTML rather than using the mobile API endpoints
  a lot of scrapers reach for.
- Serial, 1.5s between requests, exponential backoff on 429/5xx, honours `Retry-After`.
- **Put a real contact address in `USER_AGENT`** before a full run. It's the difference between
  a bot and an identifiable fan indexing shows.
- Audio stream URLs are excluded by default (`--include-audio-urls` if you want them). They're
  session-scoped and expire — don't persist or hotlink them.
- The Coach's Notes are the band's own writing, not facts like the durations and setlists.
  Attribution and a link back to each show's Bandcamp page is the neighborly move, and it
  probably sends them a few sales too.

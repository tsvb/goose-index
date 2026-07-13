import { db } from "@/db/client";
import { sql, type SQL } from "drizzle-orm";
import { setLabel } from "@/app/_components/setlist/shared";
import { trackSeconds } from "@/lib/queries/format";
import { escapeLike } from "@/lib/util";

function allRows(result: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return rows as Record<string, unknown>[];
}
const num = (v: unknown): number => Number(v ?? 0);
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));

/** Nearest-rank 95th percentile. 0 for empty. */
export function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(0.95 * (sorted.length - 1));
  return sorted[idx];
}

/** A gap is a "Dusted Off" return when it clears the 15-show floor AND the song's own p95. */
export function isDustedOffGap(gap: number | null, songGaps: number[]): boolean {
  if (gap == null || gap < 15) return false;
  return gap >= p95(songGaps);
}

// show_seq: number every PLAYED show with performances by (date, order).
// song_show: one row per (song, show) so same-show reprises don't create negative gaps.
// gapped: per (song, show) gap = seq - lag(seq) - 1.
const SHOW_SEQ = sql`
  show_seq as (
    select s.show_id,
           row_number() over (order by s.show_date, coalesce(s.show_order, 1)) as seq,
           s.show_date
    from shows s
    where s.show_date <= current_date
      and exists (select 1 from performances p where p.show_id = s.show_id)
  ),
  song_show as (
    select distinct p.song_id, ss.seq, ss.show_id, ss.show_date
    from performances p
    join show_seq ss on ss.show_id = p.show_id
  ),
  gapped as (
    select song_id, seq, show_id, show_date,
           seq - lag(seq) over (partition by song_id order by seq) - 1 as gap
    from song_show
  )`;

export type SongPerf = {
  uniqueId: string; date: string; showId: number; order: number | null;
  venue: string | null; city: string | null; state: string | null;
  setLabel: string; position: number | null;
  trackTime: string | null; seconds: number | null;
  gap: number | null; isJam: boolean; isJamchart: boolean; isDustedOff: boolean;
};

export async function getSongPerformances(songId: number): Promise<SongPerf[]> {
  const rows = allRows(await db.execute(sql`
    with ${SHOW_SEQ}
    select p.unique_id, s.show_date::text as date, s.show_id, s.show_order as "order",
           v.name as venue, v.city, v.state,
           p.set_type, p.set_number, p.position, p.track_time,
           g.gap, p.is_jam, p.is_jamchart
    from performances p
    join shows s on s.show_id = p.show_id
    left join venues v on v.venue_id = s.venue_id
    join gapped g on g.song_id = p.song_id and g.show_id = p.show_id
    where p.song_id = ${songId}
    order by s.show_date desc, coalesce(s.show_order, 1) desc, p.position asc
  `));
  const gaps = rows.map((r) => numOrNull(r.gap)).filter((g): g is number => g != null);
  return rows.map((r) => {
    const tt = strOrNull(r.track_time);
    const gap = numOrNull(r.gap);
    return {
      uniqueId: String(r.unique_id), date: String(r.date), showId: num(r.show_id),
      order: numOrNull(r.order), venue: strOrNull(r.venue), city: strOrNull(r.city), state: strOrNull(r.state),
      setLabel: setLabel(strOrNull(r.set_type), strOrNull(r.set_number)), position: numOrNull(r.position),
      trackTime: tt, seconds: trackSeconds(tt),
      gap, isJam: Boolean(r.is_jam), isJamchart: Boolean(r.is_jamchart),
      isDustedOff: isDustedOffGap(gap, gaps),
    };
  });
}

export type SongStat = {
  songId: number; name: string; slug: string; isOriginal: boolean; originalArtist: string | null;
  timesPlayed: number;
  debutDate: string | null; debutShowId: number | null; debutOrder: number | null;
  lastPlayedDate: string | null; lastShowId: number | null; lastOrder: number | null;
  currentGap: number | null; longestGap: number | null; avgGap: number | null;
  rotationPct: number; longestSeconds: number | null;
  playsPerYear: { year: number; count: number }[];
  setPlacement: { set1: number; set2: number; encore: number; opener: number; jammed: number };
  longestVersions: { date: string; showId: number; order: number | null; venue: string | null; trackTime: string; seconds: number }[];
  topVenues: { venueId: number; name: string; count: number }[];
};

// ── Song Index ────────────────────────────────────────────────────────────────

export type SongSort = "played" | "rare" | "overdue" | "rotation" | "recent" | "debut" | "az" | "album";

/**
 * The album a song sorts under, when it's on more than one.
 *
 * A song can appear on several studio releases — an advance single and then the
 * LP (`Good2B` → *BIG MODERN!*), or a session version and then the album
 * (`Iguana Song` on *Chateau Sessions pt III* and *Everything Must Go*). "Which
 * album is it on?" has one answer a fan means: the album, not its own trailer.
 * So the biggest release wins, earliest breaking a tie.
 *
 * Live albums are excluded. A song being on *Live at Madison Square Garden*
 * doesn't answer the question, and counting them would put nearly every song
 * "on an album" — which would make the sort useless and the unreleased half
 * invisible.
 */
const PRIMARY_ALBUM = sql`
  primary_album as (
    select distinct on (t.song_id)
           t.song_id, al.album_id, al.title, al.slug, al.release_date, al.url, t.track_num
    from album_tracks t
    join albums al on al.album_id = t.album_id
    where al.kind = 'studio' and t.song_id is not null
    order by t.song_id, al.num_tracks desc, al.release_date asc
  )`;

/**
 * "Most overdue" is a cut, not just an ordering: without a plays floor the top
 * of the list is one-off retired covers. Shared by /songs?sort=overdue and
 * /stats/current-gaps so the two pages can never disagree.
 */
export const OVERDUE_MIN_PLAYS = 5;
export type SongFacet = "all" | "originals" | "covers";
export type SongIndexRow = {
  songId: number; name: string; slug: string; isOriginal: boolean;
  timesPlayed: number; rotationPct: number; currentGap: number | null;
  lastPlayedDate: string | null; debutYear: number | null; playsPerYear: number[];
  /** The studio release this song sorts under, or null — about half of Goose's
   * originals have never been released, and every cover is unreleased by them. */
  album: { title: string; slug: string | null; releaseDate: string | null; trackNum: number; url: string | null } | null;
};

export async function listSongs(
  opts: { sort?: SongSort; facet?: SongFacet; q?: string; page?: number; perPage?: number } = {},
): Promise<{ rows: SongIndexRow[]; total: number }> {
  const sort = opts.sort ?? "played";
  const facet = opts.facet ?? "all";
  const perPage = Math.max(1, Math.floor(opts.perPage ?? 100));
  const page = Math.max(1, Math.floor(opts.page ?? 1));
  const facetCond =
    facet === "originals" ? sql`and so.is_original` :
    facet === "covers" ? sql`and not so.is_original` : sql``;
  const qCond = opts.q?.trim() ? sql`and so.name ilike ${"%" + escapeLike(opts.q.trim()) + "%"}` : sql``;

  // year span for the sparkline
  const [span] = allRows(await db.execute(sql`
    select extract(year from min(show_date))::int as lo, extract(year from current_date)::int as hi
    from shows where show_date <= current_date
  `));
  const lo = num(span?.lo) || new Date().getUTCFullYear();
  const hi = num(span?.hi) || lo;
  const years: number[] = [];
  for (let y = lo; y <= hi; y++) years.push(y);

  // overdue applies the ≥OVERDUE_MIN_PLAYS floor as a filter (see the constant's doc).
  const overdueCond = sort === "overdue" ? sql`and coalesce(a.times_played, 0) >= ${OVERDUE_MIN_PLAYS}` : sql``;
  const orderBy: SQL =
    sort === "rare" ? sql`times_played asc, last_seq desc nulls last` :
    sort === "overdue" ? sql`current_gap desc nulls last, times_played desc` :
    sort === "rotation" ? sql`rotation desc, times_played desc, lower(name) asc` :
    sort === "recent" ? sql`last_seq desc nulls last` :
    sort === "debut" ? sql`debut_seq desc nulls last` :
    sort === "az" ? sql`lower(name) asc` :
    // Newest release first, then the running order of the album itself — a
    // discography read top to bottom. Songs with no release fall to the end
    // (nulls last), where the page gathers them under "Unreleased".
    sort === "album" ? sql`album_release_date desc nulls last, album_title asc, album_track_num asc, lower(name) asc` :
    sql`times_played desc, lower(name) asc`;

  const rows = allRows(await db.execute(sql`
    with ${SHOW_SEQ},
    ${PRIMARY_ALBUM},
    agg as (
      select song_id, count(*)::int as times_played,
             min(seq) as debut_seq, max(seq) as last_seq,
             (select max(seq) from show_seq) - max(seq) as current_gap
      from gapped group by song_id
    )
    select so.song_id, so.name, so.slug, so.is_original,
           pa.title as album_title, pa.slug as album_slug, pa.url as album_url,
           pa.release_date::text as album_release_date, pa.track_num as album_track_num,
           coalesce(a.times_played, 0) as times_played,
           a.current_gap, a.debut_seq, a.last_seq,
           (select max(show_date)::text from song_show ssh where ssh.song_id = so.song_id) as last_date,
           (select min(show_date) from song_show ssh where ssh.song_id = so.song_id) as debut_date,
           round((coalesce(a.times_played,0)::numeric /
                  greatest((select count(*) from show_seq where seq >= a.debut_seq), 1)) * 1000) / 10 as rotation
    from songs so
    left join agg a on a.song_id = so.song_id
    left join primary_album pa on pa.song_id = so.song_id
    where coalesce(a.times_played, 0) > 0 ${facetCond} ${qCond} ${overdueCond}
    order by ${orderBy}
    limit ${perPage} offset ${(page - 1) * perPage}
  `));

  // total counts the whole cut, not the window, so page math stays right even
  // when the requested page runs off the end (mirrors listShows).
  const [cnt] = allRows(await db.execute(sql`
    with ${SHOW_SEQ},
    agg as (select song_id, count(*)::int as times_played from song_show group by song_id)
    select count(*)::int as total
    from songs so
    left join agg a on a.song_id = so.song_id
    where coalesce(a.times_played, 0) > 0 ${facetCond} ${qCond} ${overdueCond}
  `));
  const total = num(cnt?.total);

  // plays per year per song (one grouped query, bucket in TS)
  const ppyRows = allRows(await db.execute(sql`
    select p.song_id, extract(year from s.show_date)::int as year, count(*)::int as c
    from performances p join shows s on s.show_id = p.show_id
    where s.show_date <= current_date group by 1, 2
  `));
  const ppy = new Map<number, Map<number, number>>();
  for (const r of ppyRows) {
    const sid = num(r.song_id);
    if (!ppy.has(sid)) ppy.set(sid, new Map());
    ppy.get(sid)!.set(num(r.year), num(r.c));
  }

  const pageRows = rows.map((r) => {
    const sid = num(r.song_id);
    const byYear = ppy.get(sid) ?? new Map();
    return {
      songId: sid, name: String(r.name), slug: String(r.slug), isOriginal: Boolean(r.is_original),
      timesPlayed: num(r.times_played), rotationPct: num(r.rotation), currentGap: numOrNull(r.current_gap),
      lastPlayedDate: strOrNull(r.last_date),
      debutYear: r.debut_date ? new Date(String(r.debut_date)).getUTCFullYear() : null,
      playsPerYear: years.map((y) => byYear.get(y) ?? 0),
      album: r.album_title
        ? {
            title: String(r.album_title),
            slug: strOrNull(r.album_slug),
            releaseDate: strOrNull(r.album_release_date),
            trackNum: num(r.album_track_num),
            url: strOrNull(r.album_url),
          }
        : null,
    };
  });
  return { rows: pageRows, total };
}

/**
 * Fill a sparse ascending {year, count} series so every year from the first
 * entry (the debut) through `through` renders — droughts become explicit
 * zero-count columns instead of silently collapsing. Empty stays empty.
 */
export function zeroFillYears(series: { year: number; count: number }[], through: number): { year: number; count: number }[] {
  if (series.length === 0) return series;
  const byYear = new Map(series.map((s) => [s.year, s.count]));
  const lo = series[0].year;
  const hi = Math.max(series[series.length - 1].year, through);
  const out: { year: number; count: number }[] = [];
  for (let y = lo; y <= hi; y++) out.push({ year: y, count: byYear.get(y) ?? 0 });
  return out;
}

export interface SongSearchRow {
  songId: number; name: string; slug: string | null;
  timesPlayed: number; lastPlayedDate: string | null;
}

/** Name-substring search for the global search page. Never-played songs match too (timesPlayed 0). */
export async function searchSongs(q: string, limit = 12): Promise<{ rows: SongSearchRow[]; total: number }> {
  const like = `%${escapeLike(q.trim())}%`;
  const raw = allRows(await db.execute(sql`
    with ${SHOW_SEQ},
    agg as (
      select song_id, count(*)::int as times_played, max(show_date)::text as last_date
      from song_show group by song_id
    )
    select so.song_id, so.name, so.slug,
           coalesce(a.times_played, 0) as times_played, a.last_date,
           count(*) over ()::int as full_count
    from songs so
    left join agg a on a.song_id = so.song_id
    where so.name ilike ${like}
    order by coalesce(a.times_played, 0) desc, lower(so.name) asc
    limit ${limit}
  `));
  return {
    rows: raw.map((r) => ({
      songId: num(r.song_id), name: String(r.name), slug: strOrNull(r.slug),
      timesPlayed: num(r.times_played), lastPlayedDate: strOrNull(r.last_date),
    })),
    total: raw.length ? num(raw[0].full_count) : 0,
  };
}

// ── Stats cuts ────────────────────────────────────────────────────────────────

export async function mostPlayed(limit = 100): Promise<SongIndexRow[]> {
  return (await listSongs({ sort: "played", perPage: limit })).rows;
}

export async function rarities(limit = 100): Promise<SongIndexRow[]> {
  // Low-play songs, but a cover played only once is a one-off, not a rarity —
  // keep one-time originals (genuine rare gems) and any cover that recurred.
  // The filter runs in TS, so scan the whole catalog rather than one page.
  return (await listSongs({ sort: "rare", perPage: Number.MAX_SAFE_INTEGER })).rows
    .filter((r) => r.timesPlayed <= 3 && (r.isOriginal || r.timesPlayed > 1))
    .slice(0, limit);
}

export async function currentGaps(limit = 100): Promise<SongIndexRow[]> {
  // The ≥OVERDUE_MIN_PLAYS floor is part of the overdue sort itself (listSongs).
  return (await listSongs({ sort: "overdue", perPage: limit })).rows;
}

export async function debutsByYear(): Promise<{ year: number; count: number }[]> {
  const byYear = allRows(await db.execute(sql`
    with ${SHOW_SEQ},
    debut as (select song_id, min(show_date) as d from song_show group by song_id)
    select extract(year from d)::int as year, count(*)::int as count from debut group by 1 order by 1
  `)).map((r) => ({ year: num(r.year), count: num(r.count) }));
  return zeroFillYears(byYear, new Date().getUTCFullYear());
}

export async function recentDebuts(limit = 25): Promise<{ slug: string; name: string; date: string; venue: string | null }[]> {
  return allRows(await db.execute(sql`
    with first_play as (
      select p.song_id, min(s.show_date) as d
      from performances p join shows s on s.show_id = p.show_id
      where s.show_date <= current_date group by p.song_id
    )
    select so.slug, so.name, fp.d::text as date,
      (select v.name from shows s2 left join venues v on v.venue_id = s2.venue_id
       where s2.show_date = fp.d order by coalesce(s2.show_order,1) limit 1) as venue
    from first_play fp join songs so on so.song_id = fp.song_id
    order by fp.d desc, so.name asc limit ${limit}
  `)).map((r) => ({ slug: String(r.slug), name: String(r.name), date: String(r.date), venue: strOrNull(r.venue) }));
}

export async function setStats(): Promise<{ key: string; label: string; rows: { slug: string; name: string; count: number }[] }[]> {
  const buckets: { key: string; label: string; cond: SQL }[] = [
    { key: "show-opener", label: "Show openers", cond: sql`p.position = 1 and (p.set_number = '1' or p.set_type = 'One Set')` },
    { key: "set2-opener", label: "Set 2 openers", cond: sql`p.position = 1 and p.set_number = '2'` },
    { key: "encore", label: "Encores", cond: sql`p.set_type = 'Encore' or p.set_number ilike 'e%'` },
  ];
  const out = [];
  for (const b of buckets) {
    const rows = allRows(await db.execute(sql`
      select so.slug, so.name, count(*)::int as count
      from performances p join songs so on so.song_id = p.song_id
      join shows s on s.show_id = p.show_id
      where s.show_date <= current_date and (${b.cond})
      group by so.slug, so.name order by count desc, so.name asc limit 15
    `)).map((r) => ({ slug: String(r.slug), name: String(r.name), count: num(r.count) }));
    out.push({ key: b.key, label: b.label, rows });
  }
  return out;
}

export type StatsHubHighlights = {
  mostPlayed: { name: string; slug: string; plays: number } | null;
  raritiesCount: number;
  mostOverdue: { name: string; slug: string; gap: number } | null;
  latestDebut: { name: string; slug: string; date: string } | null;
  topOpener: { name: string; slug: string; count: number } | null;
};

/**
 * One headline per cut for the /stats hub, without running the five full cuts:
 * two cheap queries (one pass over the gap CTE + one over openers). Each
 * headline uses the same criteria and ordering as its cut page — mostPlayed
 * mirrors listSongs "played", raritiesCount mirrors rarities(), mostOverdue
 * applies the ≥OVERDUE_MIN_PLAYS floor, latestDebut mirrors recentDebuts(),
 * topOpener mirrors setStats()'s show-opener bucket.
 */
export async function statsHubHighlights(): Promise<StatsHubHighlights> {
  const [row] = allRows(await db.execute(sql`
    with ${SHOW_SEQ},
    agg as (
      select song_id, count(*)::int as times_played,
             min(show_date) as debut_date,
             (select max(seq) from show_seq) - max(seq) as current_gap
      from gapped group by song_id
    ),
    named as (
      select a.*, so.name, so.slug, so.is_original
      from agg a join songs so on so.song_id = a.song_id
    )
    select
      mp.name as mp_name, mp.slug as mp_slug, mp.times_played as mp_plays,
      (select count(*)::int from named
       where times_played <= 3 and (is_original or times_played > 1)) as rarities_count,
      od.name as od_name, od.slug as od_slug, od.current_gap as od_gap,
      de.name as de_name, de.slug as de_slug, de.debut_date::text as de_date
    from (values (1)) as one(x)
    left join lateral (select name, slug, times_played from named
      order by times_played desc, lower(name) asc limit 1) mp on true
    left join lateral (select name, slug, current_gap from named
      where times_played >= ${OVERDUE_MIN_PLAYS}
      order by current_gap desc nulls last, times_played desc limit 1) od on true
    left join lateral (select name, slug, debut_date from named
      order by debut_date desc, name asc limit 1) de on true
  `));
  const [op] = allRows(await db.execute(sql`
    select so.name, so.slug, count(*)::int as count
    from performances p join songs so on so.song_id = p.song_id
    join shows s on s.show_id = p.show_id
    where s.show_date <= current_date
      and p.position = 1 and (p.set_number = '1' or p.set_type = 'One Set')
    group by so.slug, so.name order by count(*) desc, so.name asc limit 1
  `));
  return {
    mostPlayed: row?.mp_slug ? { name: String(row.mp_name), slug: String(row.mp_slug), plays: num(row.mp_plays) } : null,
    raritiesCount: num(row?.rarities_count),
    mostOverdue: row?.od_slug ? { name: String(row.od_name), slug: String(row.od_slug), gap: num(row.od_gap) } : null,
    latestDebut: row?.de_slug ? { name: String(row.de_name), slug: String(row.de_slug), date: String(row.de_date) } : null,
    topOpener: op ? { name: String(op.name), slug: String(op.slug), count: num(op.count) } : null,
  };
}

// ── Song detail ───────────────────────────────────────────────────────────────

export async function getSongBySlug(slug: string): Promise<SongStat | null> {
  const [meta] = allRows(await db.execute(sql`
    select song_id, name, slug, is_original, original_artist from songs where slug = ${slug} order by song_id limit 1
  `));
  if (!meta) return null;
  const songId = num(meta.song_id);

  const perfs = await getSongPerformances(songId); // newest-first, carries gap
  const timesPlayed = perfs.length;
  const debut = perfs[perfs.length - 1] ?? null;
  const last = perfs[0] ?? null;
  const gaps = perfs.map((p) => p.gap).filter((g): g is number => g != null);
  const longestGap = gaps.length ? Math.max(...gaps) : null;
  const avgGap = gaps.length ? Math.round((gaps.reduce((a, b) => a + b, 0) / gaps.length) * 10) / 10 : null;

  // current gap = max(seq) - last perf seq
  const [cg] = allRows(await db.execute(sql`
    with ${SHOW_SEQ}
    select (select max(seq) from show_seq) - max(g.seq) as current_gap
    from gapped g where g.song_id = ${songId}
  `));
  const currentGap = numOrNull(cg?.current_gap);

  // rotation = timesPlayed / shows since debut (inclusive)
  const [rot] = allRows(await db.execute(sql`
    with ${SHOW_SEQ},
    deb as (select min(seq) as d from gapped where song_id = ${songId})
    select (select count(*) from show_seq, deb where seq >= deb.d) as denom
  `));
  const denom = num(rot?.denom) || 1;
  const rotationPct = Math.round((timesPlayed / denom) * 1000) / 10;

  // plays per year, zero-filled debut→today so droughts stay visible
  const ppy = zeroFillYears(
    allRows(await db.execute(sql`
      select extract(year from s.show_date)::int as year, count(*)::int as count
      from performances p join shows s on s.show_id = p.show_id
      where p.song_id = ${songId} and s.show_date <= current_date
      group by 1 order by 1
    `)).map((r) => ({ year: num(r.year), count: num(r.count) })),
    new Date().getUTCFullYear(),
  );

  // set placement percentages
  const place = allRows(await db.execute(sql`
    select
      count(*) filter (where set_type <> 'Encore' and (set_number = '1' or set_type = 'One Set'))::int as set1,
      count(*) filter (where set_number = '2')::int as set2,
      count(*) filter (where set_type = 'Encore' or set_number ilike 'e%')::int as encore,
      count(*) filter (where position = 1)::int as opener,
      count(*) filter (where is_jam or is_jamchart)::int as jammed,
      count(*)::int as total
    from performances where song_id = ${songId}
  `))[0];
  const tot = num(place?.total) || 1;
  const pct = (v: unknown) => Math.round((num(v) / tot) * 100);
  const setPlacement = { set1: pct(place?.set1), set2: pct(place?.set2), encore: pct(place?.encore), opener: pct(place?.opener), jammed: pct(place?.jammed) };

  const longestVersions = perfs
    .filter((p) => p.seconds != null)
    .sort((a, b) => (b.seconds ?? 0) - (a.seconds ?? 0))
    .slice(0, 5)
    .map((p) => ({ date: p.date, showId: p.showId, order: p.order, venue: p.venue, trackTime: p.trackTime!, seconds: p.seconds! }));

  const topVenues = allRows(await db.execute(sql`
    select v.venue_id, v.name, count(*)::int as count
    from performances p join shows s on s.show_id = p.show_id
    join venues v on v.venue_id = s.venue_id
    where p.song_id = ${songId}
    group by v.venue_id, v.name order by count desc, v.name asc limit 5
  `)).map((r) => ({ venueId: num(r.venue_id), name: String(r.name), count: num(r.count) }));

  return {
    songId, name: String(meta.name), slug: String(meta.slug),
    isOriginal: Boolean(meta.is_original), originalArtist: strOrNull(meta.original_artist),
    timesPlayed,
    debutDate: debut?.date ?? null, debutShowId: debut?.showId ?? null, debutOrder: debut?.order ?? null,
    lastPlayedDate: last?.date ?? null, lastShowId: last?.showId ?? null, lastOrder: last?.order ?? null,
    currentGap, longestGap, avgGap, rotationPct,
    longestSeconds: longestVersions[0]?.seconds ?? null,
    playsPerYear: ppy, setPlacement, longestVersions, topVenues,
  };
}

export type SongAlbum = {
  title: string;
  releaseDate: string | null;
  trackNum: number;
  url: string | null;
  numTracks: number;
};

/**
 * Every studio release a song appears on, oldest first — the single, then the
 * album it was trailing, then the session take.
 *
 * The song *index* has to pick one album to sort under, but a song's own page
 * doesn't: "Iguana Song" really is on both Chateau Sessions pt III and Everything
 * Must Go, and a fan reading about it should see both and be able to buy either.
 */
export async function getSongAlbums(songId: number): Promise<SongAlbum[]> {
  const rows = allRows(await db.execute(sql`
    select al.title, al.release_date::text as release_date, al.url, al.num_tracks, t.track_num
    from album_tracks t
    join albums al on al.album_id = t.album_id
    where t.song_id = ${songId} and al.kind = 'studio'
    order by al.release_date asc nulls last, al.title asc
  `));
  return rows.map((r) => ({
    title: String(r.title),
    releaseDate: strOrNull(r.release_date),
    trackNum: num(r.track_num),
    url: strOrNull(r.url),
    numTracks: num(r.num_tracks),
  }));
}

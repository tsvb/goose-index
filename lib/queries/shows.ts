import { db } from "@/db/client";
import { shows, venues, tours, performances, songs } from "@/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { p95, isDustedOffGap } from "./songs";
import { normalizeDateQuery } from "./search-dates";
import { escapeLike } from "@/lib/util";

function allRows(result: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return rows as Record<string, unknown>[];
}

export type ShowSummary = {
  showId: number;
  date: string;
  order: number | null;
  venue: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  tour: string | null;
  tourId: number | null;
  songCount: number;
  hasNotes: boolean;
};

// Correlated subqueries keep these single-row-per-show (no GROUP BY gymnastics).
const songCountSql = sql<number>`(select count(*)::int from performances p where p.show_id = ${shows.showId})`;
const hasNotesSql = sql<boolean>`(${shows.notes} is not null and ${shows.notes} <> '')`;

function summaryColumns() {
  return {
    showId: shows.showId,
    date: shows.showDate,
    order: shows.showOrder,
    venue: venues.name,
    city: venues.city,
    state: venues.state,
    country: venues.country,
    tour: tours.name,
    tourId: shows.tourId,
    songCount: songCountSql,
    hasNotes: hasNotesSql,
  };
}

function baseShowQuery() {
  return db
    .select(summaryColumns())
    .from(shows)
    .leftJoin(venues, eq(venues.venueId, shows.venueId))
    .leftJoin(tours, eq(tours.tourId, shows.tourId));
}

export async function getRecentShows(limit = 6): Promise<ShowSummary[]> {
  return baseShowQuery()
    .where(sql`${shows.showDate} <= current_date`)
    .orderBy(desc(shows.showDate), desc(shows.showOrder))
    .limit(limit);
}

export async function getUpcomingShows(limit = 5): Promise<ShowSummary[]> {
  return baseShowQuery()
    .where(sql`${shows.showDate} > current_date`)
    .orderBy(asc(shows.showDate), asc(shows.showOrder))
    .limit(limit);
}

/** Past shows that happened on today's month + day, most recent first. */
export async function getOnThisDay(): Promise<ShowSummary[]> {
  return baseShowQuery()
    .where(sql`to_char(${shows.showDate}, 'MM-DD') = to_char(current_date, 'MM-DD') and ${shows.showDate} < current_date`)
    .orderBy(desc(shows.showDate));
}

export async function getShowsOnDate(date: string): Promise<ShowSummary[]> {
  return baseShowQuery()
    .where(eq(shows.showDate, date))
    .orderBy(asc(shows.showOrder));
}

/**
 * Shows dated today — the home page's Tonight banner. Usually one show, but
 * multi-show days (matinee + evening) return all of them in show order.
 * getRecentShows still includes today (date <= current_date); callers that
 * hoist tonight into its own treatment filter these ids out themselves.
 */
export async function getTonightShows(): Promise<ShowSummary[]> {
  return baseShowQuery()
    .where(sql`${shows.showDate} = current_date`)
    .orderBy(asc(shows.showOrder));
}

export type ShowDetail = ShowSummary & {
  venueId: number | null;
  permalink: string | null;
  notes: string | null;
  /** The band's own release of this night, when they've put one out. */
  bandcampUrl: string | null;
};

export async function getShowDetails(date: string): Promise<ShowDetail[]> {
  return db
    .select({
      ...summaryColumns(),
      venueId: shows.venueId,
      permalink: shows.permalink,
      notes: shows.notes,
      bandcampUrl: shows.bandcampUrl,
    })
    .from(shows)
    .leftJoin(venues, eq(venues.venueId, shows.venueId))
    .leftJoin(tours, eq(tours.tourId, shows.tourId))
    .where(eq(shows.showDate, date))
    .orderBy(asc(shows.showOrder));
}

export type SetlistEntry = {
  uniqueId: string;
  songId: number;
  song: string;
  slug: string | null;
  setType: string | null;
  setNumber: string | null;
  position: number | null;
  trackTime: string | null;
  transition: string | null;
  isJamchart: boolean;
  jamchartNotes: string | null;
  isJam: boolean;
  isReprise: boolean;
  isOriginal: boolean;
  originalArtist: string | null;
  footnote: string | null;
  gap: number | null;
  isDustedOff: boolean;
};

export async function getSetlist(showId: number): Promise<SetlistEntry[]> {
  const typeRank = sql<number>`case ${performances.setType}
    when 'Soundcheck' then 0 when 'Set' then 1 when 'Encore' then 2 else 3 end`;
  const rows = await db
    .select({
      uniqueId: performances.uniqueId,
      songId: performances.songId,
      song: songs.name,
      slug: songs.slug,
      setType: performances.setType,
      setNumber: performances.setNumber,
      position: performances.position,
      trackTime: performances.trackTime,
      transition: performances.transition,
      isJamchart: performances.isJamchart,
      jamchartNotes: performances.jamchartNotes,
      isJam: performances.isJam,
      isReprise: performances.isReprise,
      isOriginal: songs.isOriginal,
      originalArtist: songs.originalArtist,
      footnote: performances.footnote,
    })
    .from(performances)
    .innerJoin(songs, eq(songs.songId, performances.songId))
    .where(eq(performances.showId, showId))
    .orderBy(typeRank, asc(performances.setNumber), asc(performances.position));

  // compute per-song gap at THIS show + the full gap series (for TS-side p95, matching song page logic)
  const gapRows = allRows(await db.execute(sql`
    with show_seq as (
      select s.show_id, row_number() over (order by s.show_date, coalesce(s.show_order,1)) as seq
      from shows s where s.show_date <= current_date and exists (select 1 from performances p where p.show_id = s.show_id)
    ),
    song_show as (select distinct p.song_id, ss.seq, ss.show_id from performances p join show_seq ss on ss.show_id = p.show_id),
    gapped as (select song_id, seq, show_id, seq - lag(seq) over (partition by song_id order by seq) - 1 as gap from song_show),
    this_show as (select song_id, gap from gapped where show_id = ${showId})
    select ts.song_id, ts.gap as this_gap,
           array_agg(g.gap) filter (where g.gap is not null) as gaps
    from this_show ts join gapped g on g.song_id = ts.song_id
    group by ts.song_id, ts.gap
  `));
  const bySong = new Map<number, { thisGap: number | null; gaps: number[] }>();
  for (const r of gapRows) {
    const raw = r.gaps;
    const gaps: number[] = Array.isArray(raw) ? raw.map(Number) : [];
    bySong.set(Number(r.song_id), { thisGap: r.this_gap == null ? null : Number(r.this_gap), gaps });
  }
  return rows.map((e) => {
    const info = bySong.get(e.songId);
    const gap = info?.thisGap ?? null;
    const isDustedOff = isDustedOffGap(gap, info?.gaps ?? []);
    return { ...e, gap, isDustedOff };
  });
}

export type ShowNeighbor = { date: string; order: number | null; venue: string | null; city: string | null; state: string | null } | null;

export async function getShowNeighbors(
  date: string,
  order: number | null,
): Promise<{ prev: ShowNeighbor; next: ShowNeighbor }> {
  const ord = order ?? 1;
  const cols = {
    date: shows.showDate,
    order: shows.showOrder,
    venue: venues.name,
    city: venues.city,
    state: venues.state,
  };
  // Walk the true chronological sequence (date, show_order) so multi-show
  // dates step through show 1 → 2 → n before crossing to the next date.
  const seqOrder = sql`coalesce(${shows.showOrder}, 1)`;
  const [prev] = await db
    .select(cols)
    .from(shows)
    .leftJoin(venues, eq(venues.venueId, shows.venueId))
    .where(sql`(${shows.showDate}, coalesce(${shows.showOrder}, 1)) < (${date}::date, ${ord})`)
    .orderBy(desc(shows.showDate), desc(seqOrder))
    .limit(1);
  const [next] = await db
    .select(cols)
    .from(shows)
    .leftJoin(venues, eq(venues.venueId, shows.venueId))
    .where(sql`(${shows.showDate}, coalesce(${shows.showOrder}, 1)) > (${date}::date, ${ord})`)
    .orderBy(asc(shows.showDate), asc(seqOrder))
    .limit(1);
  return { prev: prev ?? null, next: next ?? null };
}

export type ShowListFilter = {
  year?: number;
  tourId?: number;
  venueId?: number;
  page?: number;
  perPage?: number;
  dir?: "asc" | "desc";
};

export async function listShows(filter: ShowListFilter): Promise<{ rows: ShowSummary[]; total: number }> {
  const perPage = filter.perPage ?? 30;
  const page = Math.max(1, filter.page ?? 1);
  const conds = [];
  if (filter.year) conds.push(sql`extract(year from ${shows.showDate}) = ${filter.year}`);
  if (filter.tourId) conds.push(eq(shows.tourId, filter.tourId));
  if (filter.venueId) conds.push(eq(shows.venueId, filter.venueId));
  const where = conds.length ? and(...conds) : undefined;

  const rows = await baseShowQuery()
    .where(where)
    .orderBy(
      filter.dir === "asc" ? asc(shows.showDate) : desc(shows.showDate),
      filter.dir === "asc" ? asc(shows.showOrder) : desc(shows.showOrder),
    )
    .limit(perPage)
    .offset((page - 1) * perPage);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(shows)
    .where(where);

  return { rows, total };
}

/**
 * Locate the most recent show that has already happened (date <= today) within
 * the active filter, and work out which page it lands on given the current sort
 * direction and page size — so the UI can deep-link straight to it.
 */
export async function findLatestPastShow(
  filter: ShowListFilter,
): Promise<{ showId: number; date: string; isToday: boolean; page: number } | null> {
  const perPage = filter.perPage ?? 30;
  const conds = [];
  if (filter.year) conds.push(sql`extract(year from ${shows.showDate}) = ${filter.year}`);
  if (filter.tourId) conds.push(eq(shows.tourId, filter.tourId));
  if (filter.venueId) conds.push(eq(shows.venueId, filter.venueId));
  const filterWhere = conds.length ? and(...conds) : undefined;
  const withFilter = (extra: ReturnType<typeof sql>) =>
    filterWhere ? and(filterWhere, extra) : extra;

  const [target] = await db
    .select({
      showId: shows.showId,
      date: shows.showDate,
      order: shows.showOrder,
      isToday: sql<boolean>`${shows.showDate} = current_date`,
    })
    .from(shows)
    .where(withFilter(sql`${shows.showDate} <= current_date`))
    .orderBy(desc(shows.showDate), desc(shows.showOrder))
    .limit(1);
  if (!target) return null;

  const ord = target.order ?? 1;
  const cmp =
    filter.dir === "asc"
      ? sql`(${shows.showDate}, coalesce(${shows.showOrder}, 1)) <= (${target.date}::date, ${ord})`
      : sql`(${shows.showDate}, coalesce(${shows.showOrder}, 1)) >= (${target.date}::date, ${ord})`;
  const [{ rank }] = await db
    .select({ rank: sql<number>`count(*)::int` })
    .from(shows)
    .where(withFilter(cmp));

  return {
    showId: target.showId,
    date: target.date,
    isToday: Boolean(target.isToday),
    page: Math.max(1, Math.ceil(rank / perPage)),
  };
}

/**
 * Global search over shows. Date-shaped queries ("2024-08-07", "8/7/2024",
 * "aug 7 2024") match show_date exactly; a month + day with no year
 * ("july 10", "7/10") matches that date across every year. Everything else
 * substring-matches the date text, venue name, and city. `total` is the full
 * match count so the UI can say when `rows` is truncated.
 */
export async function searchShows(q: string, limit = 24): Promise<{ rows: ShowSummary[]; total: number }> {
  const like = `%${escapeLike(q.trim())}%`;
  const date = normalizeDateQuery(q);
  const where = date?.iso
    ? eq(shows.showDate, date.iso)
    : date?.monthDay
      ? sql`to_char(${shows.showDate}, 'MM-DD') = ${date.monthDay}`
      : sql`(${shows.showDate}::text ilike ${like} or ${venues.name} ilike ${like} or ${venues.city} ilike ${like})`;

  const rows = await baseShowQuery()
    .where(where)
    .orderBy(desc(shows.showDate), desc(shows.showOrder))
    .limit(limit);

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(shows)
    .leftJoin(venues, eq(venues.venueId, shows.venueId))
    .where(where);

  return { rows, total };
}

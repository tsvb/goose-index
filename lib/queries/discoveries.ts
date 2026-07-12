import { db } from "@/db/client";
import { sql } from "drizzle-orm";

function allRows(result: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return rows as Record<string, unknown>[];
}
const num = (v: unknown): number => Number(v ?? 0);
const numOrNull = (v: unknown): number | null => (v == null ? null : Number(v));
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));

/** Minimum total plays for a song to qualify as "on the shelf" — filters
 * one-offs and covers that were never really in the rotation. */
export const SHELF_MIN_PLAYS = 6;
/** Minimum shows at a venue for its jam ratio to be reported. */
export const DEEPEST_MIN_SHOWS = 3;
/** How many transitions the Flow State list surfaces. */
export const TRANSITIONS_TOP_N = 15;

export type DayOfWeekJamsRow = {
  dow: number;
  dayName: string;
  totalShows: number;
  avgJams: number;
};

/** Average number of jam-tagged performances per show, by day of the week.
 * Shows with zero jams still count (LEFT JOIN → 0 contribution to the avg). */
export async function dayOfWeekJams(): Promise<DayOfWeekJamsRow[]> {
  const rows = allRows(await db.execute(sql`
    with show_jams as (
      select s.show_id,
             extract(dow from s.show_date)::int as dow,
             count(p.unique_id)::int as jam_count
      from shows s
      left join performances p
        on p.show_id = s.show_id
       and (p.is_jam = true or p.is_jamchart = true)
      where s.show_date <= current_date
      group by s.show_id, s.show_date
    )
    select dow,
           count(show_id)::int as total_shows,
           avg(jam_count)::float as avg_jams
    from show_jams
    group by dow
    order by dow
  `));
  const NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return rows.map((r) => {
    const d = num(r.dow);
    return { dow: d, dayName: NAMES[d] ?? "", totalShows: num(r.total_shows), avgJams: num(r.avg_jams) };
  });
}

export type TransitionRow = {
  sourceName: string;
  sourceSlug: string | null;
  targetName: string;
  targetSlug: string | null;
  count: number;
};

/** Top segued transitions (transition column contains ">"), across all sets. */
export async function topTransitions(): Promise<TransitionRow[]> {
  const rows = allRows(await db.execute(sql`
    with adj as (
      select p.show_id,
             p.song_id as source_id,
             lead(p.song_id) over (
               partition by p.show_id, p.set_type, p.set_number
               order by p.position
             ) as target_id,
             p.transition
      from performances p
    )
    select s1.name  as source_name, s1.slug as source_slug,
           s2.name  as target_name, s2.slug as target_slug,
           count(*)::int as ct
    from adj a
    join songs s1 on s1.song_id = a.source_id
    join songs s2 on s2.song_id = a.target_id
    where a.target_id is not null
      and a.transition is not null
      and a.transition like '%>%'
    group by s1.name, s1.slug, s2.name, s2.slug
    having count(*) > 1
    order by ct desc, lower(s1.name), lower(s2.name)
    limit ${TRANSITIONS_TOP_N}
  `));
  return rows.map((r) => ({
    sourceName: String(r.source_name),
    sourceSlug: strOrNull(r.source_slug),
    targetName: String(r.target_name),
    targetSlug: strOrNull(r.target_slug),
    count: num(r.ct),
  }));
}

export type CoachsNoteRow = {
  showId: number;
  showDate: string;
  venueName: string | null;
  coachNotes: string;
  bandcampUrl: string | null;
};

/** Most recent shows with populated coach's notes (from bandcamp releases). */
export async function coachsNotes(): Promise<CoachsNoteRow[]> {
  const rows = allRows(await db.execute(sql`
    select s.show_id,
           s.show_date::text as show_date,
           v.name as venue_name,
           s.coach_notes,
           s.bandcamp_url
    from shows s
    left join venues v on v.venue_id = s.venue_id
    where s.coach_notes is not null
      and s.coach_notes <> ''
    order by s.show_date desc, coalesce(s.show_order, 1) desc
    limit 5
  `));
  return rows.map((r) => ({
    showId: num(r.show_id),
    showDate: String(r.show_date),
    venueName: strOrNull(r.venue_name),
    coachNotes: String(r.coach_notes),
    bandcampUrl: strOrNull(r.bandcamp_url),
  }));
}

export type ShelfRow = {
  songId: number;
  name: string;
  slug: string | null;
  lastPlayedDate: string;
  totalPlays: number;
  daysSincePlayed: number;
};

/** Original songs the band hasn't played in the longest time. Filters songs
 * with fewer than SHELF_MIN_PLAYS lifetime plays so one-offs don't dominate. */
export async function originalsOnTheShelf(): Promise<ShelfRow[]> {
  const rows = allRows(await db.execute(sql`
    select so.song_id,
           so.name,
           so.slug,
           max(sh.show_date)::text as last_played_date,
           count(*)::int as total_plays,
           (current_date - max(sh.show_date))::int as days_since_played
    from performances p
    join shows sh on sh.show_id = p.show_id
    join songs so on so.song_id = p.song_id
    where so.is_original = true
      and sh.show_date <= current_date
    group by so.song_id, so.name, so.slug
    having count(*) >= ${SHELF_MIN_PLAYS}
    order by max(sh.show_date) asc
    limit 10
  `));
  return rows.map((r) => ({
    songId: num(r.song_id),
    name: String(r.name),
    slug: strOrNull(r.slug),
    lastPlayedDate: String(r.last_played_date),
    totalPlays: num(r.total_plays),
    daysSincePlayed: num(r.days_since_played),
  }));
}

export type DeepestVenueRow = {
  venueId: number;
  name: string;
  slug: string | null;
  totalShows: number;
  totalPerformances: number;
  totalJams: number;
  jamPercentage: number;
};

/** Venues where the band digs deepest — highest jam ratio, min DEEPEST_MIN_SHOWS
 * shows so a single hot night can't top the list. */
export async function deepestVenues(): Promise<DeepestVenueRow[]> {
  const rows = allRows(await db.execute(sql`
    with venue_perf as (
      select v.venue_id,
             v.name,
             v.slug,
             count(distinct sh.show_id)::int as total_shows,
             count(p.unique_id)::int as total_performances,
             sum(case when p.is_jam = true or p.is_jamchart = true then 1 else 0 end)::int as total_jams
      from venues v
      join shows sh on sh.venue_id = v.venue_id
      join performances p on p.show_id = sh.show_id
      where sh.show_date <= current_date
      group by v.venue_id, v.name, v.slug
    )
    select venue_id, name, slug, total_shows, total_performances, total_jams,
           round((total_jams::numeric / nullif(total_performances, 0)) * 100, 1)::float as jam_pct
    from venue_perf
    where total_shows >= ${DEEPEST_MIN_SHOWS}
      and total_performances > 0
    order by jam_pct desc nulls last, total_jams desc
    limit 10
  `));
  return rows.map((r) => ({
    venueId: num(r.venue_id),
    name: String(r.name),
    slug: strOrNull(r.slug),
    totalShows: num(r.total_shows),
    totalPerformances: num(r.total_performances),
    totalJams: num(r.total_jams),
    jamPercentage: num(r.jam_pct),
  }));
}

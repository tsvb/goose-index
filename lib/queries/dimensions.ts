import { db } from "@/db/client";
import { shows, venues, tours } from "@/db/schema";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { escapeLike } from "@/lib/util";

export type YearRow = { year: number; shows: number; songs: number };

export async function listYears(): Promise<YearRow[]> {
  const rows = await db
    .select({
      year: sql<number>`extract(year from ${shows.showDate})::int`,
      shows: sql<number>`count(*)::int`,
      // Sum the per-show performance counts. Written as raw `shows.show_id`:
      // drizzle renders `${shows.showId}` unqualified ("show_id") in select
      // fields, which would bind to the subquery's own table instead of the
      // outer show and count every performance for every year.
      songs: sql<number>`sum((select count(*) from performances p where p.show_id = shows.show_id))::int`,
    })
    .from(shows)
    .where(sql`${shows.showDate} <= current_date`)
    .groupBy(sql`extract(year from ${shows.showDate})`)
    .orderBy(sql`extract(year from ${shows.showDate}) desc`);
  return rows;
}

export type TourRow = {
  tourId: number;
  name: string;
  year: number | null;
  shows: number;
  start: string | null;
  end: string | null;
};

export async function listTours(): Promise<TourRow[]> {
  return db
    .select({
      tourId: tours.tourId,
      name: tours.name,
      year: tours.year,
      shows: sql<number>`count(${shows.showId})::int`,
      start: sql<string>`min(${shows.showDate})::text`,
      end: sql<string>`max(${shows.showDate})::text`,
    })
    .from(tours)
    .leftJoin(shows, eq(shows.tourId, tours.tourId))
    .groupBy(tours.tourId)
    .having(sql`count(${shows.showId}) > 0`)
    .orderBy(sql`min(${shows.showDate}) desc nulls last`);
}

export async function getTourMeta(tourId: number): Promise<TourRow | null> {
  const [row] = await db
    .select({
      tourId: tours.tourId,
      name: tours.name,
      year: tours.year,
      shows: sql<number>`count(${shows.showId})::int`,
      start: sql<string>`min(${shows.showDate})::text`,
      end: sql<string>`max(${shows.showDate})::text`,
    })
    .from(tours)
    .leftJoin(shows, eq(shows.tourId, tours.tourId))
    .where(eq(tours.tourId, tourId))
    .groupBy(tours.tourId);
  return row ?? null;
}

export type VenueRow = {
  venueId: number;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  capacity: number | null;
  shows: number;
  first: string | null;
  last: string | null;
};

export async function listVenues(opts?: { sort?: "shows" | "name"; q?: string }): Promise<VenueRow[]> {
  const order =
    opts?.sort === "name"
      ? [asc(venues.name)]
      : [sql`count(${shows.showId}) desc`, asc(venues.name)];
  // Filter matches name, city, or state so "red rocks", "chicago", and "CO" all work.
  const q = opts?.q?.trim();
  const like = q ? `%${escapeLike(q)}%` : null;
  const where = like
    ? sql`(${venues.name} ilike ${like} or ${venues.city} ilike ${like} or ${venues.state} ilike ${like})`
    : undefined;
  return db
    .select({
      venueId: venues.venueId,
      name: venues.name,
      city: venues.city,
      state: venues.state,
      country: venues.country,
      capacity: venues.capacity,
      shows: sql<number>`count(${shows.showId})::int`,
      first: sql<string>`min(${shows.showDate})::text`,
      last: sql<string>`max(${shows.showDate})::text`,
    })
    .from(venues)
    .leftJoin(shows, eq(shows.venueId, venues.venueId))
    .where(where)
    .groupBy(venues.venueId)
    .having(sql`count(${shows.showId}) > 0`)
    .orderBy(...order);
}

export async function searchVenues(q: string, limit = 12): Promise<{ rows: VenueRow[]; total: number }> {
  const like = `%${escapeLike(q.trim())}%`;
  const where = sql`(${venues.name} ilike ${like} or ${venues.city} ilike ${like})`;
  const rows = await db
    .select({
      venueId: venues.venueId,
      name: venues.name,
      city: venues.city,
      state: venues.state,
      country: venues.country,
      capacity: venues.capacity,
      shows: sql<number>`count(${shows.showId})::int`,
      first: sql<string>`min(${shows.showDate})::text`,
      last: sql<string>`max(${shows.showDate})::text`,
    })
    .from(venues)
    .leftJoin(shows, eq(shows.venueId, venues.venueId))
    .where(where)
    .groupBy(venues.venueId)
    .having(sql`count(${shows.showId}) > 0`)
    .orderBy(sql`count(${shows.showId}) desc`)
    .limit(limit);

  // Full match count (same WHERE + the has-shows rule) so the UI can flag truncation.
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(venues)
    .where(sql`${where} and exists (select 1 from ${shows} where ${shows.venueId} = ${venues.venueId})`);

  return { rows, total };
}

export async function searchTours(q: string, limit = 8): Promise<{ rows: TourRow[]; total: number }> {
  const like = `%${escapeLike(q.trim())}%`;
  const where = sql`${tours.name} ilike ${like}`;
  const rows = await db
    .select({
      tourId: tours.tourId,
      name: tours.name,
      year: tours.year,
      shows: sql<number>`count(${shows.showId})::int`,
      start: sql<string>`min(${shows.showDate})::text`,
      end: sql<string>`max(${shows.showDate})::text`,
    })
    .from(tours)
    .leftJoin(shows, eq(shows.tourId, tours.tourId))
    .where(where)
    .groupBy(tours.tourId)
    .having(sql`count(${shows.showId}) > 0`)
    .orderBy(sql`min(${shows.showDate}) desc nulls last`)
    .limit(limit);

  // Full match count (same WHERE + the has-shows rule) so the UI can flag truncation.
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(tours)
    .where(sql`${where} and exists (select 1 from ${shows} where ${shows.tourId} = ${tours.tourId})`);

  return { rows, total };
}

export async function getVenueMeta(venueId: number): Promise<VenueRow | null> {
  const [row] = await db
    .select({
      venueId: venues.venueId,
      name: venues.name,
      city: venues.city,
      state: venues.state,
      country: venues.country,
      capacity: venues.capacity,
      shows: sql<number>`count(${shows.showId})::int`,
      first: sql<string>`min(${shows.showDate})::text`,
      last: sql<string>`max(${shows.showDate})::text`,
    })
    .from(venues)
    .leftJoin(shows, eq(shows.venueId, venues.venueId))
    .where(eq(venues.venueId, venueId))
    .groupBy(venues.venueId);
  return row ?? null;
}

// ── Where Goose plays ─────────────────────────────────────────────────────────

// Raw-SQL row helpers, matching the pattern in songs.ts / discoveries.ts.
function allRows(result: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return rows as Record<string, unknown>[];
}
const num = (v: unknown): number => Number(v ?? 0);
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));

export type StateShows = { state: string; shows: number; venues: number };
export type CountryShows = { country: string; shows: number; venues: number };

/**
 * elgoose's country field is free text, so the same place arrives under more
 * than one name: "UK" and "United Kingdom" are separate rows, and Canada shows
 * up once per province. Left alone the map would draw the UK twice and Canada
 * twice — so names are folded here, where the fix is one rule rather than a
 * special case in every consumer.
 */
export function normalizeCountry(raw: string | null): string {
  const c = (raw ?? "").trim();
  if (!c) return "USA";
  if (/^(usa|us|united states.*)$/i.test(c)) return "USA";
  if (/^(uk|united kingdom|england|scotland|wales)$/i.test(c)) return "United Kingdom";
  return c;
}

/** Shows and venues per US state, keyed by the USPS code the map draws with. */
export async function showsByState(): Promise<StateShows[]> {
  const rows = allRows(await db.execute(sql`
    select v.state, count(distinct s.show_id)::int as shows, count(distinct v.venue_id)::int as venues
    from shows s
    join venues v on v.venue_id = s.venue_id
    where s.show_date <= current_date
      and v.state is not null
      and (v.country is null or v.country ~* '^(usa|us|united states)')
    group by v.state
  `));
  return rows
    .map((r) => ({ state: String(r.state).toUpperCase().trim(), shows: num(r.shows), venues: num(r.venues) }))
    .filter((r) => /^[A-Z]{2}$/.test(r.state));
}

/** Shows and venues outside the US, folded onto one row per country. */
export async function showsByCountry(): Promise<CountryShows[]> {
  const rows = allRows(await db.execute(sql`
    select v.country, count(distinct s.show_id)::int as shows, count(distinct v.venue_id)::int as venues
    from shows s
    join venues v on v.venue_id = s.venue_id
    where s.show_date <= current_date
      and v.country is not null
      and v.country !~* '^(usa|us|united states)'
    group by v.country
  `));
  const merged = new Map<string, CountryShows>();
  for (const r of rows) {
    const country = normalizeCountry(strOrNull(r.country));
    const at = merged.get(country) ?? { country, shows: 0, venues: 0 };
    at.shows += num(r.shows);
    at.venues += num(r.venues);
    merged.set(country, at);
  }
  return [...merged.values()].sort((a, b) => b.shows - a.shows || a.country.localeCompare(b.country));
}

// ── The touring year ──────────────────────────────────────────────────────────

export type TourSpan = {
  tourId: number;
  name: string;
  start: string;
  end: string;
  shows: number;
  /** Every show date on the tour, so the bar can show its rhythm and not just its span. */
  dates: string[];
  /** Shows still ahead. A tour can be wholly upcoming (Fall 2026) or half-run
   * (Summer 2026), and a timeline that quietly dropped the future would be
   * telling you the band has stopped touring. */
  upcoming: number;
};

/**
 * elgoose files every show with no tour under a pseudo-tour literally named
 * "Not Part of a Tour". It is not a tour — it's the absence of one — and it
 * spans the entire career (2014→2026, 245 shows). Drawn on a timeline it would
 * be a twelve-year bar dwarfing every real run. Excluded here, and the shows it
 * holds are counted separately, because "a third of all shows belong to no tour"
 * is a fact, not a gap.
 */
export const NOT_A_TOUR = /^not part of a tour$/i;

export async function tourTimeline(): Promise<{ tours: TourSpan[]; untouredShows: number }> {
  const rows = allRows(await db.execute(sql`
    select t.tour_id, t.name,
           min(s.show_date)::text as start,
           max(s.show_date)::text as "end",
           count(s.show_id)::int as shows,
           count(*) filter (where s.show_date > current_date)::int as upcoming,
           array_agg(s.show_date::text order by s.show_date) as dates
    from tours t
    join shows s on s.tour_id = t.tour_id
    group by t.tour_id, t.name
    order by min(s.show_date) asc
  `));

  const tours: TourSpan[] = [];
  let untouredShows = 0;
  for (const r of rows) {
    const name = String(r.name);
    const shows = num(r.shows);
    if (NOT_A_TOUR.test(name)) {
      untouredShows += shows;
      continue;
    }
    tours.push({
      tourId: num(r.tour_id),
      name,
      start: String(r.start),
      end: String(r.end),
      shows,
      upcoming: num(r.upcoming),
      dates: (r.dates as string[] | null) ?? [],
    });
  }
  return { tours, untouredShows };
}

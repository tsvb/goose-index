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
      songs: sql<number>`(select count(*)::int from performances p join shows s2 on s2.show_id = p.show_id where extract(year from s2.show_date) = extract(year from ${shows.showDate}))`,
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

export async function listVenues(opts?: { sort?: "shows" | "name" }): Promise<VenueRow[]> {
  const order =
    opts?.sort === "name"
      ? [asc(venues.name)]
      : [sql`count(${shows.showId}) desc`, asc(venues.name)];
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

import { db } from "@/db/client";
import { sql } from "drizzle-orm";

function firstRow(result: unknown): Record<string, unknown> {
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return (rows[0] ?? {}) as Record<string, unknown>;
}

export type OverviewStats = {
  showsPlayed: number;
  upcoming: number;
  songs: number;
  venues: number;
  performances: number;
  firstDate: string | null;
  lastPlayedDate: string | null;
};

export async function getOverviewStats(): Promise<OverviewStats> {
  const r = firstRow(
    await db.execute(sql`
      select
        (select count(*)::int from shows where show_date <= current_date) as shows_played,
        (select count(*)::int from shows where show_date > current_date) as upcoming,
        (select count(*)::int from songs) as songs,
        (select count(*)::int from venues v where exists (select 1 from shows s where s.venue_id = v.venue_id)) as venues,
        (select count(*)::int from performances) as performances,
        (select min(show_date)::text from shows) as first_date,
        (select max(show_date)::text from shows where show_date <= current_date) as last_played_date
    `),
  );
  return {
    showsPlayed: Number(r.shows_played ?? 0),
    upcoming: Number(r.upcoming ?? 0),
    songs: Number(r.songs ?? 0),
    venues: Number(r.venues ?? 0),
    performances: Number(r.performances ?? 0),
    firstDate: (r.first_date as string) ?? null,
    lastPlayedDate: (r.last_played_date as string) ?? null,
  };
}

import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export async function getSundayStats() {
  // Average jams per show by day of week
  const result = await db.execute<{
    dow: number;
    day_name: string;
    total_shows: number;
    avg_jams: number;
  }>(sql`
    WITH show_jams AS (
      SELECT 
        s.show_id,
        s.show_date,
        EXTRACT(DOW FROM s.show_date) as dow,
        COUNT(p.unique_id) as jam_count
      FROM shows s
      LEFT JOIN performances p ON s.show_id = p.show_id AND (p.is_jam = true OR p.is_jamchart = true)
      GROUP BY s.show_id, s.show_date
    )
    SELECT 
      dow::integer,
      CASE dow 
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END as day_name,
      COUNT(show_id)::integer as total_shows,
      ROUND(AVG(jam_count)::numeric, 2)::numeric as avg_jams
    FROM show_jams
    GROUP BY dow
    ORDER BY dow
  `);
  
  return result;
}

export async function getTransitionMatrix() {
  // Top transitions between songs
  const result = await db.execute<{
    source_name: string;
    target_name: string;
    count: number;
  }>(sql`
    WITH numbered_performances AS (
      SELECT 
        show_id,
        set_type,
        song_id as source_id,
        transition,
        LEAD(song_id) OVER (PARTITION BY show_id, set_type ORDER BY position) as target_id
      FROM performances
    ),
    transitions AS (
      SELECT source_id, target_id
      FROM numbered_performances
      WHERE target_id IS NOT NULL 
        AND transition IN ('>', '->', ' > ', ' -> ')
    )
    SELECT 
      s1.name as source_name,
      s2.name as target_name,
      COUNT(*)::integer as count
    FROM transitions t
    JOIN songs s1 ON t.source_id = s1.song_id
    JOIN songs s2 ON t.target_id = s2.song_id
    GROUP BY s1.name, s2.name
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 30
  `);
  
  return result;
}

export async function getCoachsNotes() {
  // Recent shows with Coach's Notes
  const result = await db.execute<{
    show_id: number;
    show_date: string;
    title: string;
    venue_name: string;
    coach_notes: string;
    bandcamp_url: string;
  }>(sql`
    SELECT 
      s.show_id,
      s.show_date,
      s.title,
      v.name as venue_name,
      s.coach_notes,
      s.bandcamp_url
    FROM shows s
    LEFT JOIN venues v ON s.venue_id = v.venue_id
    WHERE s.coach_notes IS NOT NULL
    ORDER BY s.show_date DESC
    LIMIT 5
  `);
  
  return result;
}

export async function getTheShelf() {
  // Original songs with the longest gap since they were last played
  const result = await db.execute<{
    name: string;
    last_played_date: string;
    total_plays: number;
    days_since_played: number;
  }>(sql`
    WITH last_played AS (
      SELECT 
        s.name,
        MAX(sh.show_date) as last_played_date,
        COUNT(*) as total_plays
      FROM performances p
      JOIN shows sh ON p.show_id = sh.show_id
      JOIN songs s ON p.song_id = s.song_id
      WHERE s.is_original = true
      GROUP BY s.name
    )
    SELECT 
      name,
      last_played_date,
      total_plays,
      CURRENT_DATE - last_played_date as days_since_played
    FROM last_played
    WHERE total_plays > 5
    ORDER BY last_played_date ASC
    LIMIT 10
  `);
  
  return result;
}

export async function getDeepestVenues() {
  // Venues with the highest ratio of jams per total performances
  const result = await db.execute<{
    name: string;
    total_shows: number;
    total_performances: number;
    total_jams: number;
    jam_percentage: number;
  }>(sql`
    WITH venue_jams AS (
      SELECT 
        v.name,
        COUNT(DISTINCT sh.show_id) as total_shows,
        COUNT(p.unique_id) as total_performances,
        SUM(CASE WHEN p.is_jam = true OR p.is_jamchart = true THEN 1 ELSE 0 END) as total_jams
      FROM shows sh
      JOIN venues v ON sh.venue_id = v.venue_id
      JOIN performances p ON sh.show_id = p.show_id
      GROUP BY v.name
    )
    SELECT 
      name,
      total_shows::integer,
      total_performances::integer,
      total_jams::integer,
      ROUND((total_jams::numeric / total_performances::numeric) * 100, 1)::numeric as jam_percentage
    FROM venue_jams
    WHERE total_shows > 2
    ORDER BY jam_percentage DESC
    LIMIT 10
  `);
  
  return result;
}

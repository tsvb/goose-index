import { db, closeDb } from "../db/client";
import * as schema from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";

async function main() {
  console.log("--- Wild Discoveries ---");

  // Query 1: What song is most likely to follow another? (Transitions)
  const transitions = await db.execute(sql`
    SELECT 
      s1.name as song1,
      s2.name as song2,
      COUNT(*) as transition_count
    FROM performances p1
    JOIN performances p2 ON p1.show_id = p2.show_id AND p1.position + 1 = p2.position
    JOIN songs s1 ON p1.song_id = s1.song_id
    JOIN songs s2 ON p2.song_id = s2.song_id
    GROUP BY s1.name, s2.name
    HAVING COUNT(*) > 5
    ORDER BY transition_count DESC
    LIMIT 10;
  `);

  console.log("\nTop 10 Transitions:");
  console.table(transitions);

  // Query 2: Which song is played disproportionately on a specific day of the week?
  const dayStats = await db.execute(sql`
    WITH song_days AS (
      SELECT 
        so.name as song_name,
        EXTRACT(DOW FROM sh.show_date) as day_of_week,
        COUNT(*) as day_plays
      FROM performances p
      JOIN shows sh ON p.show_id = sh.show_id
      JOIN songs so ON p.song_id = so.song_id
      GROUP BY so.name, EXTRACT(DOW FROM sh.show_date)
    ),
    song_totals AS (
      SELECT 
        so.name as song_name,
        COUNT(*) as total_plays
      FROM performances p
      JOIN songs so ON p.song_id = so.song_id
      GROUP BY so.name
    )
    SELECT 
      sd.song_name,
      CASE sd.day_of_week 
        WHEN 0 THEN 'Sunday'
        WHEN 1 THEN 'Monday'
        WHEN 2 THEN 'Tuesday'
        WHEN 3 THEN 'Wednesday'
        WHEN 4 THEN 'Thursday'
        WHEN 5 THEN 'Friday'
        WHEN 6 THEN 'Saturday'
      END as day,
      sd.day_plays,
      st.total_plays,
      ROUND((sd.day_plays::numeric / st.total_plays::numeric) * 100, 1) as percentage
    FROM song_days sd
    JOIN song_totals st ON sd.song_name = st.song_name
    WHERE st.total_plays >= 15 AND (sd.day_plays::numeric / st.total_plays::numeric) > 0.4
    ORDER BY percentage DESC;
  `);

  console.log("\nSongs disproportionately played on specific days:");
  console.table(dayStats);

  // Query 3: Most jammed songs vs never jammed
  const jamStats = await db.execute(sql`
    SELECT 
      so.name,
      COUNT(p.unique_id) as total_plays,
      SUM(CASE WHEN p.is_jam = true THEN 1 ELSE 0 END) as jam_count,
      ROUND((SUM(CASE WHEN p.is_jam = true THEN 1 ELSE 0 END)::numeric / COUNT(p.unique_id)::numeric) * 100, 1) as jam_percentage
    FROM performances p
    JOIN songs so ON p.song_id = so.song_id
    GROUP BY so.name
    HAVING COUNT(p.unique_id) >= 20
    ORDER BY jam_percentage DESC
    LIMIT 10;
  `);
  console.log("\nMost frequently 'Jammed' songs (>20 plays):");
  console.table(jamStats);

  await closeDb();
}

main().catch(console.error);

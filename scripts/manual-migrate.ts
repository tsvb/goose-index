import { db } from '../db/client';
import { sql } from 'drizzle-orm';

async function run() {
  console.log("Adding columns to shows table...");
  try {
    await db.execute(sql`ALTER TABLE shows ADD COLUMN IF NOT EXISTS bandcamp_album_id text`);
    await db.execute(sql`ALTER TABLE shows ADD COLUMN IF NOT EXISTS bandcamp_url text`);
    await db.execute(sql`ALTER TABLE shows ADD COLUMN IF NOT EXISTS coach_notes text`);
    console.log("Success.");
  } catch (err) {
    console.error("Error modifying table:", err);
  }
  process.exit(0);
}

run();

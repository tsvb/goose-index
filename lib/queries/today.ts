import { sql } from "drizzle-orm";
import { etToday } from "@/lib/today";

/**
 * Today as a SQL date, bound from the app's clock instead of read from the
 * database's (`current_date`). Every query that splits played from upcoming, or
 * asks whether a show is today, interpolates this. See `lib/today.ts` for why
 * the database's own answer is the wrong one.
 */
export function today() {
  return sql`${etToday()}::date`;
}

/** Re-exported so query modules have one place to ask what day it is. */
export { etToday, etYear } from "@/lib/today";

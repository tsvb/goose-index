import { it, expect, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

/**
 * The jam readings bind today's date twice — once to bound the window at the
 * newest filed chart, once to keep upcoming shows out. Built as a single `sql`
 * fragment at module scope, both would freeze at whatever day the process
 * booted: a warm serverless instance outlives midnight, and the Oracle would
 * quietly go on reading a stale "today" for as long as it stayed warm. The
 * same hazard is why `showSeq` in lib/queries/songs.ts is a function.
 *
 * Captures the SQL each query builds — no database involved.
 */
const captured: unknown[] = [];
vi.mock("@/db/client", () => ({
  db: { execute: async (q: unknown) => { captured.push(q); return { rows: [] }; } },
}));

const dialect = new PgDialect();
const datesIn = (q: unknown) =>
  dialect.sqlToQuery(q as never).params.filter((p): p is string => typeof p === "string" && /^\d{4}-\d{2}-\d{2}$/.test(p));

it("rebinds today on every call, so a warm instance can't serve yesterday's window", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });

  // Boot the process on one day and import the module then, as a server would.
  vi.setSystemTime(new Date("2026-08-21T16:00:00Z"));
  const { dayOfWeekJams, deepestVenues } = await import("@/lib/queries/discoveries");
  await dayOfWeekJams();
  expect(datesIn(captured.at(-1))).toEqual(["2026-08-21", "2026-08-21"]);

  // Four days later, same warm process.
  vi.setSystemTime(new Date("2026-08-25T16:00:00Z"));
  await dayOfWeekJams();
  expect(datesIn(captured.at(-1))).toEqual(["2026-08-25", "2026-08-25"]);

  await deepestVenues();
  expect(datesIn(captured.at(-1))).toEqual(["2026-08-25", "2026-08-25"]);

  vi.useRealTimers();
});

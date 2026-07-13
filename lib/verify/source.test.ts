import { describe, it, expect } from "vitest";
import { auditAgainstSource, GOOSE_ARTIST_ID, type SourceShow } from "./source";
import type { AppDb } from "@/db/schema";

/** A stand-in for the two rows the audit reads. No database, no network. */
function fakeDb(rows: { show_id: number; d: string; tour_id: number | null; tour_name: string | null }[]) {
  return { execute: async () => rows } as unknown as AppDb;
}
const src = (over: Partial<SourceShow> & { show_id: number }): SourceShow => ({
  showdate: "2026-06-13",
  artist_id: GOOSE_ARTIST_ID,
  tour_id: 44,
  tourname: "Summer Tour 2026",
  ...over,
});

const pass = (rs: { name: string; pass: boolean }[], name: string) => rs.find((r) => r.name.includes(name))!.pass;

describe("auditAgainstSource", () => {
  it("passes when the cache is a faithful copy", async () => {
    const results = await auditAgainstSource({
      db: fakeDb([{ show_id: 1, d: "2026-06-13", tour_id: 44, tour_name: "Summer Tour 2026" }]),
      fetchShows: async () => [src({ show_id: 1 })],
    });
    expect(results.every((r) => r.pass)).toBe(true);
  });

  // The whole point: it has to FAIL when the data drifts, or it's decoration.
  it("catches a show filed under the wrong tour", async () => {
    const results = await auditAgainstSource({
      db: fakeDb([{ show_id: 1, d: "2026-06-13", tour_id: 45, tour_name: "Fall Tour 2026" }]),
      fetchShows: async () => [src({ show_id: 1, tour_id: 44 })],
    });
    expect(pass(results, "tour assignment")).toBe(false);
  });

  it("catches a show elgoose has and we don't", async () => {
    const results = await auditAgainstSource({
      db: fakeDb([]),
      fetchShows: async () => [src({ show_id: 1 })],
    });
    expect(pass(results, "shows present")).toBe(false);
  });

  it("catches a show we hold that elgoose has dropped", async () => {
    // Shows do get merged or withdrawn; a stale row would haunt the site forever.
    const results = await auditAgainstSource({
      db: fakeDb([{ show_id: 99, d: "2020-01-01", tour_id: null, tour_name: null }]),
      fetchShows: async () => [src({ show_id: 1 })],
    });
    expect(pass(results, "no stale shows")).toBe(false);
  });

  it("catches a date that moved", async () => {
    const results = await auditAgainstSource({
      db: fakeDb([{ show_id: 1, d: "2026-06-14", tour_id: 44, tour_name: "Summer Tour 2026" }]),
      fetchShows: async () => [src({ show_id: 1, showdate: "2026-06-13" })],
    });
    expect(pass(results, "show dates")).toBe(false);
  });

  it("catches a tour that was renamed at the source", async () => {
    const results = await auditAgainstSource({
      db: fakeDb([{ show_id: 1, d: "2026-06-13", tour_id: 44, tour_name: "Summer Tour 2026" }]),
      fetchShows: async () => [src({ show_id: 1, tourname: "Summer Tour 2026 (Leg 1)" })],
    });
    expect(pass(results, "tour names")).toBe(false);
  });

  it("ignores the ~100 other artists elgoose tracks", async () => {
    // 335 of elgoose's shows are side projects and guests. They are not ours to
    // hold, and counting them as "missing" would fail the audit forever.
    const results = await auditAgainstSource({
      db: fakeDb([{ show_id: 1, d: "2026-06-13", tour_id: 44, tour_name: "Summer Tour 2026" }]),
      fetchShows: async () => [src({ show_id: 1 }), src({ show_id: 2, artist_id: 8 }), src({ show_id: 3, artist_id: 54 })],
    });
    expect(results.every((r) => r.pass)).toBe(true);
  });

  it("treats a tourless show as tourless, not as drift", async () => {
    const results = await auditAgainstSource({
      db: fakeDb([{ show_id: 1, d: "2026-06-13", tour_id: null, tour_name: null }]),
      fetchShows: async () => [src({ show_id: 1, tour_id: 0, tourname: "" })],
    });
    expect(results.every((r) => r.pass)).toBe(true);
  });
});

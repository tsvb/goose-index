import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * The cache key has to be the shape the query resolves to, not the spelling the
 * caller happened to use. Where the two drift, one answer gets filed under many
 * keys — every one an hour-long entry and a fresh Postgres round-trip — and the
 * spellings arrive from public URLs (`/search?q=`, `/songs?sort=`, `/shows?page=`),
 * so the number of them is whatever a crawler feels like.
 *
 * These tests read the key arguments directly: `cachedQuery` is stubbed to record
 * its call and return without ever invoking the query, so nothing here needs a
 * database.
 */
const calls: { key: string; args: unknown[] }[] = [];

vi.mock("./cache", () => ({
  CATALOG_TAG: "catalog",
  showDateTag: (date: string) => `show:${date}`,
  showIdTag: (id: number) => `show-id:${id}`,
  cachedQuery: async (key: string, args: unknown[]) => {
    calls.push({ key, args });
    return { rows: [], total: 0 };
  },
}));

/** The key arguments the last call recorded. */
const argsOf = (name: string): unknown[] => {
  const call = calls.find((c) => c.key === name);
  if (!call) throw new Error(`${name} never reached cachedQuery`);
  return call.args;
};

beforeEach(() => {
  calls.length = 0;
});

describe("search terms reduce to one key", () => {
  it("searchShows files every casing and padding of a term together", async () => {
    const { searchShows } = await import("./shows");
    for (const q of ["Goose", "goose", "  GOOSE  ", "\tgOoSe\n"]) await searchShows(q);
    const keys = calls.map((c) => JSON.stringify(c.args));
    expect(new Set(keys).size).toBe(1);
    expect(argsOf("searchShows")).toEqual(["goose", 24]);
  });

  it("searchSongs, searchVenues and searchTours do the same", async () => {
    const { searchSongs } = await import("./songs");
    const { searchVenues, searchTours } = await import("./dimensions");
    await searchSongs("  Echo Of A Rose ");
    await searchVenues(" RED ROCKS ");
    await searchTours("  Summer Tour  ");
    expect(argsOf("searchSongs")).toEqual(["echo of a rose", 12]);
    expect(argsOf("searchVenues")).toEqual(["red rocks", 12]);
    expect(argsOf("searchTours")).toEqual(["summer tour", 8]);
  });

  it("an empty and a whitespace-only term are the unfiltered listing", async () => {
    const { listVenues } = await import("./dimensions");
    await listVenues();
    await listVenues({ q: "" });
    await listVenues({ q: "   " });
    await listVenues({ sort: "shows" });
    const keys = calls.map((c) => JSON.stringify(c.args));
    expect(new Set(keys).size).toBe(1);
    expect(argsOf("listVenues")).toEqual(["shows", ""]);
  });
});

describe("paging and sort options reduce to one key", () => {
  it("listShows collapses the spellings of page 1, desc, and no filter", async () => {
    const { listShows } = await import("./shows");
    await listShows({ perPage: 30 });
    await listShows({ page: 1, perPage: 30 });
    await listShows({ page: 0, perPage: 30 });
    await listShows({ page: -5, perPage: 30 });
    await listShows({ page: NaN, perPage: 30 });
    await listShows({ page: 1.4, perPage: 30 });
    await listShows({ dir: "desc", perPage: 30 });
    await listShows({ year: undefined, tourId: NaN, perPage: 30 });
    const keys = calls.map((c) => JSON.stringify(c.args));
    expect(new Set(keys).size).toBe(1);
    expect(argsOf("listShows")).toEqual([null, null, null, "desc", 1, 30]);
  });

  it("listShows keeps genuinely different cuts apart", async () => {
    const { listShows } = await import("./shows");
    await listShows({ perPage: 30 });
    await listShows({ page: 2, perPage: 30 });
    await listShows({ dir: "asc", perPage: 30 });
    await listShows({ year: 2024, perPage: 30 });
    await listShows({ perPage: 400 });
    const keys = calls.map((c) => JSON.stringify(c.args));
    expect(new Set(keys).size).toBe(5);
  });

  it("listShows keys positionally, so argument order cannot fork the key", async () => {
    const { listShows } = await import("./shows");
    await listShows({ year: 2024, dir: "asc", perPage: 400 });
    await listShows({ perPage: 400, dir: "asc", year: 2024 });
    expect(new Set(calls.map((c) => JSON.stringify(c.args))).size).toBe(1);
  });

  it("listSongs collapses an unrecognised sort or facet onto the default", async () => {
    const { listSongs } = await import("./songs");
    await listSongs();
    await listSongs({ sort: "played", facet: "all" });
    // `sort`/`facet` reach the query straight from searchParams, which asserts
    // the type rather than checking it — `?sort=anything` renders the default.
    await listSongs({ sort: "bogus" as never, facet: "nonsense" as never });
    await listSongs({ q: "  ", page: 0 });
    const keys = calls.map((c) => JSON.stringify(c.args));
    expect(new Set(keys).size).toBe(1);
    expect(argsOf("listSongs")).toEqual(["played", "all", "", 1, 100, null]);
  });

  it("listSongs keeps the real sorts and facets apart", async () => {
    const { listSongs } = await import("./songs");
    for (const sort of ["played", "rare", "overdue", "rotation", "recent", "debut", "az", "album"] as const) {
      await listSongs({ sort });
    }
    expect(new Set(calls.map((c) => JSON.stringify(c.args))).size).toBe(8);
  });
});

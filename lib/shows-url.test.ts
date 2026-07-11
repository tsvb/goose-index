import { describe, it, expect } from "vitest";
import { buildShowsHref, resolveDir, resolvePer, SHOWS_DEFAULT_DIR, type ShowsQuery } from "./shows-url";

const base: ShowsQuery = { dir: "desc", per: 50, page: 1 };

describe("resolveDir", () => {
  it("defaults to desc (newest first) and honours both explicit directions", () => {
    expect(SHOWS_DEFAULT_DIR).toBe("desc");
    expect(resolveDir(undefined)).toBe("desc");
    expect(resolveDir("nonsense")).toBe("desc");
    expect(resolveDir("desc")).toBe("desc");
    expect(resolveDir("asc")).toBe("asc");
  });
});

describe("resolvePer", () => {
  it("defaults to 50 and only allows the supported sizes", () => {
    expect(resolvePer(undefined)).toBe(50);
    expect(resolvePer("100")).toBe(100);
    expect(resolvePer("50")).toBe(50);
    expect(resolvePer("75")).toBe(50);
    expect(resolvePer("0")).toBe(50);
  });
});

describe("buildShowsHref", () => {
  it("omits every default so the bare page is clean", () => {
    expect(buildShowsHref(base)).toBe("/shows");
  });

  it("sets a year", () => {
    expect(buildShowsHref(base, { year: 2024 })).toBe("/shows?year=2024");
  });

  it("adds a tour within the current year", () => {
    expect(buildShowsHref({ ...base, year: 2024 }, { tourId: 5 })).toBe("/shows?year=2024&tour=5");
  });

  it("clears the tour and page when the year changes", () => {
    const current: ShowsQuery = { ...base, year: 2023, tourId: 5, page: 3 };
    expect(buildShowsHref(current, { year: 2024 })).toBe("/shows?year=2024");
  });

  it("clears the tour and page when the year is cleared", () => {
    const current: ShowsQuery = { ...base, year: 2023, tourId: 5, page: 3 };
    expect(buildShowsHref(current, { year: null })).toBe("/shows");
  });

  it("encodes non-default dir and per", () => {
    expect(buildShowsHref(base, { dir: "asc" })).toBe("/shows?dir=asc");
    expect(buildShowsHref(base, { per: 100 })).toBe("/shows?per=100");
  });

  it("omits the default desc dir", () => {
    expect(buildShowsHref({ ...base, dir: "asc" }, { dir: "desc" })).toBe("/shows");
  });

  it("preserves current filters when paging", () => {
    const current: ShowsQuery = { year: 2024, tourId: 5, dir: "asc", per: 100, page: 1 };
    expect(buildShowsHref(current, { page: 2 })).toBe("/shows?year=2024&tour=5&dir=asc&per=100&page=2");
  });

  it("resets to page 1 when a filter (not the page) changes", () => {
    const current: ShowsQuery = { ...base, page: 5 };
    expect(buildShowsHref(current, { dir: "asc" })).toBe("/shows?dir=asc");
  });
});

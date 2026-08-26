import { describe, it, expect } from "vitest";
import { toBool, emptyToNull, chunk, escapeLike, searchTerm, positiveInt } from "./util";

describe("toBool", () => {
  it("treats 1, '1', true as true and 0, '0', '' as false", () => {
    expect(toBool(1)).toBe(true);
    expect(toBool("1")).toBe(true);
    expect(toBool(true)).toBe(true);
    expect(toBool(0)).toBe(false);
    expect(toBool("0")).toBe(false);
    expect(toBool("")).toBe(false);
    expect(toBool(null)).toBe(false);
  });
});

describe("emptyToNull", () => {
  it("maps empty/undefined to null, keeps real strings", () => {
    expect(emptyToNull("")).toBeNull();
    expect(emptyToNull("   ")).toBeNull();
    expect(emptyToNull(undefined)).toBeNull();
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull("x")).toBe("x");
  });
});

describe("chunk", () => {
  it("splits into size-bounded groups", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});

describe("escapeLike", () => {
  it("escapes ILIKE metacharacters so user text matches literally", () => {
    expect(escapeLike("100%")).toBe("100\\%");
    expect(escapeLike("a_b")).toBe("a\\_b");
    expect(escapeLike("back\\slash")).toBe("back\\\\slash");
    expect(escapeLike("plain text")).toBe("plain text");
  });
});

describe("searchTerm", () => {
  // The queries match with ILIKE against a trimmed term, so these spellings are
  // one question. They have to reduce to one cache key or each files its own
  // hour-long entry — and `/search?q=` takes unbounded public input.
  it("folds the spellings ILIKE already treats as one query", () => {
    expect(searchTerm("Goose")).toBe("goose");
    expect(searchTerm("  goose  ")).toBe("goose");
    expect(searchTerm("GOOSE")).toBe("goose");
    expect(searchTerm("\tGoose\n")).toBe("goose");
  });

  it("leaves an empty term empty, so callers can drop the filter", () => {
    expect(searchTerm("")).toBe("");
    expect(searchTerm("   ")).toBe("");
  });

  it("keeps ILIKE metacharacters for escapeLike to handle", () => {
    expect(searchTerm(" R_D ")).toBe("r_d");
    expect(escapeLike(searchTerm(" R_D "))).toBe("r\\_d");
  });
});

describe("positiveInt", () => {
  it("passes through a positive integer", () => {
    expect(positiveInt(3, 1)).toBe(3);
    expect(positiveInt(1, 1)).toBe(1);
    expect(positiveInt(Number.MAX_SAFE_INTEGER, 100)).toBe(Number.MAX_SAFE_INTEGER);
  });

  it("falls back for the values the queries already collapsed onto the default", () => {
    expect(positiveInt(undefined, 30)).toBe(30);
    expect(positiveInt(0, 30)).toBe(30);
    expect(positiveInt(-5, 30)).toBe(30);
  });

  // `?page=abc` reaches the query as NaN, which drizzle drops as falsy (the
  // reader silently gets page 1) while `JSON.stringify(NaN)` is "null" — so it
  // rendered page 1 under a cache key of its own.
  it("rejects NaN and Infinity rather than passing them through", () => {
    expect(positiveInt(NaN, 1)).toBe(1);
    expect(positiveInt(Infinity, 1)).toBe(1);
    expect(positiveInt(-Infinity, 1)).toBe(1);
  });

  it("floors, so a fractional page cannot claim a key of its own", () => {
    expect(positiveInt(2.7, 1)).toBe(2);
    expect(positiveInt(1.0001, 1)).toBe(1);
  });
});

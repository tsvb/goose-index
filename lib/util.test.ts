import { describe, it, expect } from "vitest";
import { toBool, emptyToNull, chunk, escapeLike } from "./util";

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

import { describe, it, expect } from "vitest";
import { validateUsername, validateEmail } from "./validate";

describe("validateUsername", () => {
  it("accepts 3–20 chars of [A-Za-z0-9_-], preserving case", () => {
    expect(validateUsername("  HonkFan_22 ")).toEqual({ ok: true, username: "HonkFan_22" });
  });
  it.each(["ab", "a".repeat(21), "sp ace", "émile", "dot.name", ""])("rejects %j", (bad) => {
    expect(validateUsername(bad).ok).toBe(false);
  });
});

describe("validateEmail", () => {
  it("lowercases and trims", () => {
    expect(validateEmail(" Tim@Example.COM ")).toEqual({ ok: true, emailLower: "tim@example.com" });
  });
  it.each(["no-at", "two@@ats", "@start.com", "end@", "a@b", ""])("rejects %j", (bad) => {
    expect(validateEmail(bad).ok).toBe(false);
  });
});

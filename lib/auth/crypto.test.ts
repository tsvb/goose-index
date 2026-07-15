import { describe, it, expect } from "vitest";
import { newToken, hashToken } from "./crypto";

describe("auth crypto", () => {
  it("generates url-safe 43-char tokens, unique per call", () => {
    const a = newToken(), b = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(a).not.toBe(b);
  });
  it("hashes deterministically to sha256 hex", () => {
    expect(hashToken("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
    expect(hashToken("abc")).toBe(hashToken("abc"));
  });
});

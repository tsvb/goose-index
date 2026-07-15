import { describe, it, expect } from "vitest";
import { safeBack } from "@/lib/forum/safe-back";

const fd = (back: string | null) => {
  const f = new FormData();
  if (back !== null) f.set("back", back);
  return f;
};

describe("safeBack", () => {
  it("allows same-origin absolute forum paths", () => {
    expect(safeBack(fd("/forum/threads/2-x?page=1#post-3"))).toBe("/forum/threads/2-x?page=1#post-3");
    expect(safeBack(fd("/forum"))).toBe("/forum");
  });
  it("rejects protocol-relative and backslash-normalized off-site targets", () => {
    expect(safeBack(fd("//evil.com"))).toBe("/forum");
    expect(safeBack(fd("/\\evil.com"))).toBe("/forum");
    expect(safeBack(fd("https://evil.com"))).toBe("/forum");
    expect(safeBack(fd("javascript:alert(1)"))).toBe("/forum");
  });
  it("rejects relative/empty/missing and honors a custom fallback", () => {
    expect(safeBack(fd("forum/x"))).toBe("/forum");
    expect(safeBack(fd(""))).toBe("/forum");
    expect(safeBack(fd(null))).toBe("/forum");
    expect(safeBack(fd("nope"), "/forum/admin")).toBe("/forum/admin");
  });
});

import { describe, it, expect } from "vitest";
import { threadPath, boardPath, parseThreadKey } from "./urls";

describe("forum urls", () => {
  it("builds thread and board paths, adding ?page= only past page 1", () => {
    expect(threadPath(12, "hello-world")).toBe("/forum/threads/12-hello-world");
    expect(threadPath(12, "hello-world", 1)).toBe("/forum/threads/12-hello-world");
    expect(threadPath(12, "hello-world", 3)).toBe("/forum/threads/12-hello-world?page=3");
    expect(boardPath("tour-talk", 2)).toBe("/forum/tour-talk?page=2");
  });
  it("parses thread keys", () => {
    expect(parseThreadKey("12-hello-world")).toEqual({ id: 12, slug: "hello-world" });
    expect(parseThreadKey("12")).toEqual({ id: 12, slug: null });
    expect(parseThreadKey("12-")).toEqual({ id: 12, slug: "" });
    expect(parseThreadKey("abc")).toBeNull();
    expect(parseThreadKey("")).toBeNull();
  });
});

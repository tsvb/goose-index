import { describe, it, expect } from "vitest";
import { threadSlug } from "./slugs";

describe("threadSlug", () => {
  it.each([
    ["Red Rocks N2 — that Arcadia!!", "red-rocks-n2-that-arcadia"],
    ["Tapes & Media chat", "tapes-and-media-chat"],
    ["¿¡???!", "thread"],
    ["  spaces   everywhere  ", "spaces-everywhere"],
  ])("%j → %j", (title, slug) => expect(threadSlug(title)).toBe(slug));
  it("caps length at 60 without a trailing dash", () => {
    const s = threadSlug("word ".repeat(30));
    expect(s.length).toBeLessThanOrEqual(60);
    expect(s.endsWith("-")).toBe(false);
  });
});

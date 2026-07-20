import { describe, it, expect } from "vitest";
import { parseFrontMatter } from "./frontmatter";

const good = `---
title: The index gets a blog
date: 2026-07-20
summary: Why this site now has a place for prose.
tags: site, engine
---

Body starts here.`;

describe("parseFrontMatter", () => {
  it("parses the four-key grammar and hands back the body untouched", () => {
    const { meta, body } = parseFrontMatter(good);
    expect(meta).toEqual({
      title: "The index gets a blog",
      date: "2026-07-20",
      summary: "Why this site now has a place for prose.",
      tags: ["site", "engine"],
    });
    expect(body.trim()).toBe("Body starts here.");
  });

  it("tags are optional and default to none", () => {
    const { meta } = parseFrontMatter("---\ntitle: T\ndate: 2026-01-02\nsummary: S\n---\n");
    expect(meta.tags).toEqual([]);
  });

  it("title in the value may contain colons", () => {
    const { meta } = parseFrontMatter("---\ntitle: Re: the charts\ndate: 2026-01-02\nsummary: S\n---\n");
    expect(meta.title).toBe("Re: the charts");
  });

  it("refuses a file without an opening fence", () => {
    expect(() => parseFrontMatter("title: nope\n")).toThrow(/front matter fence/);
  });

  it("refuses an unclosed fence", () => {
    expect(() => parseFrontMatter("---\ntitle: T\n")).toThrow(/never closed/);
  });

  it("a closing fence with trailing whitespace still closes", () => {
    const { meta, body } = parseFrontMatter("---\ntitle: T\ndate: 2026-01-02\nsummary: S\n---  \nBody");
    expect(meta.title).toBe("T");
    expect(body.trim()).toBe("Body");
  });

  it("refuses unknown and duplicate keys instead of guessing", () => {
    expect(() => parseFrontMatter("---\ntitle: T\ndate: 2026-01-02\nsummary: S\nauthor: X\n---\n")).toThrow(
      /unknown front matter key "author"/,
    );
    expect(() => parseFrontMatter("---\ntitle: T\ntitle: U\ndate: 2026-01-02\nsummary: S\n---\n")).toThrow(
      /duplicate front matter key "title"/,
    );
  });

  it("requires title, summary, and a real-shaped date", () => {
    expect(() => parseFrontMatter("---\ndate: 2026-01-02\nsummary: S\n---\n")).toThrow(/missing `title`/);
    expect(() => parseFrontMatter("---\ntitle: T\ndate: 2026-01-02\n---\n")).toThrow(/missing `summary`/);
    expect(() => parseFrontMatter("---\ntitle: T\ndate: Jan 2\nsummary: S\n---\n")).toThrow(/YYYY-MM-DD/);
    expect(() => parseFrontMatter("---\ntitle: T\ndate: 2026-13-02\nsummary: S\n---\n")).toThrow(/not a real calendar date/);
    expect(() => parseFrontMatter("---\ntitle: T\ndate: 2026-02-31\nsummary: S\n---\n")).toThrow(/not a real calendar date/);
  });
});

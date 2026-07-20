import { describe, it, expect } from "vitest";
import { parseMarkdown, parseInlines, plainText, songRefLabel, showRefLabel, type Block } from "./markdown";

/** Narrow a block to one variant of the union, failing the test otherwise. */
function as<K extends Block["kind"]>(block: Block, kind: K): Extract<Block, { kind: K }> {
  if (block.kind !== kind) throw new Error(`expected a ${kind} block, got ${block.kind}`);
  return block as Extract<Block, { kind: K }>;
}

describe("parseInlines", () => {
  it("plain text passes through as one node", () => {
    expect(parseInlines("just words")).toEqual([{ kind: "text", text: "just words" }]);
  });

  it("strong, em, and code nest the way markdown reads", () => {
    expect(parseInlines("**bold *and italic***")).toEqual([
      {
        kind: "strong",
        children: [
          { kind: "text", text: "bold " },
          { kind: "em", children: [{ kind: "text", text: "and italic" }] },
        ],
      },
    ]);
    expect(parseInlines("run `npm run sync` nightly")).toEqual([
      { kind: "text", text: "run " },
      { kind: "code", text: "npm run sync" },
      { kind: "text", text: " nightly" },
    ]);
  });

  it("underscore emphasis needs a word edge, so snake_case survives", () => {
    expect(parseInlines("the ga_experience cookie")).toEqual([
      { kind: "text", text: "the ga_experience cookie" },
    ]);
    expect(parseInlines("_quietly_")).toEqual([
      { kind: "em", children: [{ kind: "text", text: "quietly" }] },
    ]);
  });

  it("backslash escapes the syntax characters", () => {
    expect(parseInlines("2 \\* 3 and a literal \\[bracket\\]")).toEqual([
      { kind: "text", text: "2 * 3 and a literal [bracket]" },
    ]);
  });

  it("unclosed markers fall back to literal text rather than eating the line", () => {
    expect(parseInlines("a lone * star")).toEqual([{ kind: "text", text: "a lone * star" }]);
    expect(parseInlines("a lone ` tick")).toEqual([{ kind: "text", text: "a lone ` tick" }]);
  });

  it("links parse and unsafe targets are refused", () => {
    expect(parseInlines("[elgoose](https://elgoose.net) and [stats](/stats)")).toEqual([
      { kind: "link", href: "https://elgoose.net", children: [{ kind: "text", text: "elgoose" }] },
      { kind: "text", text: " and " },
      { kind: "link", href: "/stats", children: [{ kind: "text", text: "stats" }] },
    ]);
    expect(() => parseInlines("[x](javascript:boom)")).toThrow(/link target/);
    // Protocol-relative reads internal but leaves the site.
    expect(() => parseInlines("[x](//evil.example)")).toThrow(/link target/);
  });

  it("a link-shaped thing that doesn't parse is an error; a stray bracket is prose", () => {
    expect(() => parseInlines("[text](https://a b)")).toThrow(/malformed link/);
    expect(parseInlines("as noted [sic] elsewhere")).toEqual([{ kind: "text", text: "as noted [sic] elsewhere" }]);
  });

  it("emphasis openers must hug their text — spaced asterisks stay literal", () => {
    expect(parseInlines("2 a.m. * nightly * roughly")).toEqual([
      { kind: "text", text: "2 a.m. * nightly * roughly" },
    ]);
  });

  it("show and song refs parse, with optional |label", () => {
    expect(parseInlines("[[show:2021-07-03]]")).toEqual([{ kind: "show-ref", date: "2021-07-03", label: null }]);
    expect(parseInlines("[[song:hot-tea|Hot Tea (reprise)]]")).toEqual([
      { kind: "song-ref", slug: "hot-tea", label: "Hot Tea (reprise)" },
    ]);
    expect(() => parseInlines("[[show:last tuesday]]")).toThrow(/YYYY-MM-DD/);
    expect(() => parseInlines("[[song:Hot Tea]]")).toThrow(/lowercase slug/);
    expect(() => parseInlines("[[venue:9]]")).toThrow(/malformed/);
  });

  it("default ref labels: shows read as dates, songs as title-cased slugs", () => {
    expect(showRefLabel("2021-07-03")).toBe("Jul 3, 2021");
    expect(songRefLabel("hot-tea")).toBe("Hot Tea");
    expect(songRefLabel("arcadia")).toBe("Arcadia");
  });
});

describe("parseMarkdown", () => {
  it("folds soft-wrapped lines into one paragraph and splits on blanks", () => {
    const blocks = parseMarkdown("one\ntwo\n\nthree");
    expect(blocks).toHaveLength(2);
    expect(plainText(as(blocks[0], "paragraph").children)).toBe("one two");
  });

  it("headings carry stable anchor ids; # and #### are refused", () => {
    const [h] = parseMarkdown("## How the sync works");
    expect(h).toMatchObject({ kind: "heading", level: 2, id: "how-the-sync-works" });
    expect(() => parseMarkdown("# Title")).toThrow(/reserved for the post title/);
    expect(() => parseMarkdown("#### deep")).toThrow(/deeper than/);
  });

  it("code fences keep their contents verbatim, including markdown syntax", () => {
    const [b] = parseMarkdown("```bash\nnpm run sync # **not bold**\n```");
    expect(b).toEqual({ kind: "code", lang: "bash", text: "npm run sync # **not bold**" });
    expect(() => parseMarkdown("```\nunclosed")).toThrow(/never closed/);
  });

  it("lists: unordered, ordered, and hanging continuation lines", () => {
    const [ul] = parseMarkdown("- first\n- second\n  wraps on\n- third");
    expect(ul).toMatchObject({ kind: "list", ordered: false });
    const items = as(ul, "list").items;
    expect(items).toHaveLength(3);
    expect(plainText(items[1])).toBe("second wraps on");
    const [ol] = parseMarkdown("1. a\n2. b");
    expect(ol).toMatchObject({ kind: "list", ordered: true });
  });

  it("nested lists are refused rather than silently folded into the parent item", () => {
    expect(() => parseMarkdown("- parent\n  - child")).toThrow(/nested lists/);
    expect(() => parseMarkdown("1. parent\n   2. child")).toThrow(/nested lists/);
  });

  it("quotes group into paragraphs split by bare > lines", () => {
    const [q] = parseMarkdown("> first thought\n> continues\n>\n> second thought");
    const paras = as(q, "quote").paragraphs;
    expect(paras).toHaveLength(2);
    expect(plainText(paras[0])).toBe("first thought continues");
  });

  it("rules and standalone images become their own blocks", () => {
    const blocks = parseMarkdown("above\n\n---\n\n![the shelf](/docs/shelf.png)");
    expect(blocks[1]).toEqual({ kind: "rule" });
    expect(blocks[2]).toEqual({ kind: "image", src: "/docs/shelf.png", alt: "the shelf" });
  });

  it("a paragraph ends where the next block begins, blank line or not", () => {
    const blocks = parseMarkdown("intro line\n## heading");
    expect(blocks.map((b) => b.kind)).toEqual(["paragraph", "heading"]);
  });
});

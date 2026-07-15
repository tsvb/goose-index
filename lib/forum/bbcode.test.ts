import { describe, it, expect } from "vitest";
import { parseBBCode, parseBBCodeInline, type BBNode } from "./bbcode";

const text = (t: string): BBNode => ({ kind: "text", text: t });

describe("parseBBCode", () => {
  it("parses simple inline tags, case-insensitively", () => {
    expect(parseBBCode("a [B]b[/B] c")).toEqual([
      text("a "), { kind: "b", children: [text("b")] }, text(" c"),
    ]);
  });

  it("nests tags", () => {
    expect(parseBBCode("[b][i]x[/i][/b]")).toEqual([
      { kind: "b", children: [{ kind: "i", children: [text("x")] }] },
    ]);
  });

  it("keeps unclosed tags literal", () => {
    expect(parseBBCode("[b]never closed")).toEqual([text("[b]"), text("never closed")]);
  });

  it("keeps stray closers and unknown tags literal", () => {
    expect(parseBBCode("x[/b]y")).toEqual([text("x"), text("[/b]"), text("y")]);
    expect(flatten(parseBBCode("[img]x[/img]"))).toBe("[img]x[/img]"); // literal runs may split into adjacent text nodes
  });

  it("handles misnesting without crashing (inner closer literal)", () => {
    const nodes = parseBBCode("[b][i]x[/b][/i]");
    // [b] closes with the [i] frame unwound to literal; exact splits may vary — assert the invariant:
    expect(JSON.stringify(nodes)).toContain('"b"');
    expect(flatten(nodes)).toBe("[i]x[/i]"); // helper below: all human-visible text
  });

  it("[code] is verbatim — tags inside are not parsed", () => {
    expect(parseBBCode("[code][b]raw[/b][/code]")).toEqual([{ kind: "code", text: "[b]raw[/b]" }]);
  });

  it("quote carries its author and caps nesting at 3", () => {
    expect(parseBBCode("[quote=Tim]hi[/quote]")).toEqual([
      { kind: "quote", author: "Tim", children: [text("hi")] },
    ]);
    const deep = "[quote=a][quote=b][quote=c][quote=d]x[/quote][/quote][/quote][/quote]";
    const nodes = parseBBCode(deep);
    let depth = 0, cur = nodes;
    while (cur.some((n) => n.kind === "quote")) {
      depth++;
      cur = (cur.find((n) => n.kind === "quote") as Extract<BBNode, { kind: "quote" }>).children;
    }
    expect(depth).toBe(3); // the 4th [quote=d] stayed literal
  });

  it("[url=…] keeps href and label; bare [url] uses its content as href", () => {
    expect(parseBBCode("[url=https://elgoose.net]el goose[/url]")).toEqual([
      { kind: "url", href: "https://elgoose.net", children: [text("el goose")] },
    ]);
    expect(parseBBCode("[url]https://x.co[/url]")).toEqual([
      { kind: "url", href: "https://x.co", children: [text("https://x.co")] },
    ]);
  });

  it("autolinks bare URLs in plain text", () => {
    expect(parseBBCode("see https://gooseindex.com now")).toEqual([
      text("see "),
      { kind: "url", href: "https://gooseindex.com", children: [text("https://gooseindex.com")] },
      text(" now"),
    ]);
  });

  it("keeps javascript: hrefs in the AST (renderer refuses them)", () => {
    expect(parseBBCode("[url=javascript:alert(1)]x[/url]")).toEqual([
      { kind: "url", href: "javascript:alert(1)", children: [text("x")] },
    ]);
  });

  it("turns newlines into br nodes", () => {
    expect(parseBBCode("a\nb")).toEqual([text("a"), { kind: "br" }, text("b")]);
  });
});

describe("parseBBCodeInline (signatures)", () => {
  it("allows b/i/url, keeps everything else literal", () => {
    expect(parseBBCodeInline("[b]x[/b]")).toEqual([{ kind: "b", children: [text("x")] }]);
    expect(flatten(parseBBCodeInline("[quote]x[/quote]"))).toBe("[quote]x[/quote]");
    expect(flatten(parseBBCodeInline("[code]x[/code]"))).toBe("[code]x[/code]");
  });
});

/** All human-visible text in order (text nodes; recurse children; code text). */
function flatten(nodes: BBNode[]): string {
  return nodes.map((n) => {
    if (n.kind === "text") return n.text;
    if (n.kind === "br") return "\n";
    if (n.kind === "code") return n.text;
    return flatten(n.children);
  }).join("");
}

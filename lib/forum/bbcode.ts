import { QUOTE_DEPTH_MAX } from "./constants";

export type BBNode =
  | { kind: "text"; text: string }
  | { kind: "br" }
  | { kind: "b" | "i" | "u" | "s"; children: BBNode[] }
  | { kind: "url"; href: string; children: BBNode[] }
  | { kind: "quote"; author: string | null; children: BBNode[] }
  | { kind: "code"; text: string };

type Tag = "b" | "i" | "u" | "s" | "url" | "quote" | "code";
const ALL: Tag[] = ["b", "i", "u", "s", "url", "quote", "code"];
const INLINE: Tag[] = ["b", "i", "url"];

const TOKEN_RE = /\[(\/?)(b|i|u|s|url|quote|code)(?:=([^\]]*))?\]/gi;
const URL_RE = /https?:\/\/[^\s<>[\]]+/g;

type Frame = { tag: Tag; arg: string | null; literal: string; children: BBNode[] };

export function parseBBCode(src: string): BBNode[] { return parse(src, new Set(ALL)); }
export function parseBBCodeInline(src: string): BBNode[] { return parse(src, new Set(INLINE)); }

function parse(src: string, allowed: Set<Tag>): BBNode[] {
  const root: BBNode[] = [];
  const stack: Frame[] = [];
  const sink = () => (stack.length ? stack[stack.length - 1].children : root);
  const inCode = () => stack.some((f) => f.tag === "code");
  const inUrl = () => stack.some((f) => f.tag === "url");
  const quoteDepth = () => stack.filter((f) => f.tag === "quote").length;

  let i = 0;
  TOKEN_RE.lastIndex = 0;
  for (let m = TOKEN_RE.exec(src); m; m = TOKEN_RE.exec(src)) {
    if (m.index > i) pushText(sink(), src.slice(i, m.index), !inCode() && !inUrl());
    i = m.index + m[0].length;
    const closing = m[1] === "/";
    const tag = m[2].toLowerCase() as Tag;
    const arg = m[3] ?? null;
    const literal = m[0];

    if (!allowed.has(tag) || (inCode() && !(closing && tag === "code"))) {
      pushText(sink(), literal, false);
    } else if (!closing) {
      if (tag === "quote" && quoteDepth() >= QUOTE_DEPTH_MAX) pushText(sink(), literal, false);
      else stack.push({ tag, arg, literal, children: [] });
    } else {
      // Closing tag: search the whole stack (not just the top) for a matching
      // open frame. Anything above the match is misnested — unwind it to
      // literal open-tag text + its own children — then close the match.
      const idx = findMatchIndex(stack, tag);
      if (idx === -1) {
        pushText(sink(), literal, false); // stray closer, no open frame at all
      } else {
        while (stack.length - 1 > idx) {
          const g = stack.pop()!;
          sink().push({ kind: "text", text: g.literal }, ...g.children);
        }
        const f = stack.pop()!;
        sink().push(close(f));
      }
    }
  }
  if (i < src.length) pushText(sink(), src.slice(i), !inCode() && !inUrl());
  // Unclosed frames unwind to literal open-tag + children.
  while (stack.length > 0) {
    const f = stack.pop()!;
    sink().push({ kind: "text", text: f.literal }, ...f.children);
  }
  return root;
}

/** Nearest enclosing frame with this tag, searched from the top of the stack down. */
function findMatchIndex(stack: Frame[], tag: Tag): number {
  for (let idx = stack.length - 1; idx >= 0; idx--) {
    if (stack[idx].tag === tag) return idx;
  }
  return -1;
}

function close(f: Frame): BBNode {
  if (f.tag === "code") return { kind: "code", text: textOf(f.children) };
  if (f.tag === "quote") return { kind: "quote", author: f.arg, children: f.children };
  if (f.tag === "url") {
    const href = f.arg ?? textOf(f.children);
    const children = f.children.length > 0 ? f.children : [{ kind: "text", text: href } as BBNode];
    return { kind: "url", href, children };
  }
  return { kind: f.tag, children: f.children } as BBNode;
}

/** Plain text of nodes (for [code] bodies and bare-[url] hrefs). */
function textOf(nodes: BBNode[]): string {
  return nodes.map((n) => {
    if (n.kind === "text") return n.text;
    if (n.kind === "br") return "\n";
    if (n.kind === "code") return n.text;
    return textOf(n.children);
  }).join("");
}

/** Split on newlines (→ br) and, when enabled, autolink bare URLs. */
function pushText(dst: BBNode[], raw: string, autolink: boolean): void {
  raw.split("\n").forEach((line, idx) => {
    if (idx > 0) dst.push({ kind: "br" });
    if (!line) return;
    if (!autolink) { dst.push({ kind: "text", text: line }); return; }
    let last = 0;
    URL_RE.lastIndex = 0;
    for (let m = URL_RE.exec(line); m; m = URL_RE.exec(line)) {
      if (m.index > last) dst.push({ kind: "text", text: line.slice(last, m.index) });
      dst.push({ kind: "url", href: m[0], children: [{ kind: "text", text: m[0] }] });
      last = m.index + m[0].length;
    }
    if (last < line.length) dst.push({ kind: "text", text: line.slice(last) });
  });
}

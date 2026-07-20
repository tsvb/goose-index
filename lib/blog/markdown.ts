// The blog's markdown engine. Bespoke and deliberately small: the grammar
// below is the whole contract, and anything outside it is a parse error
// rather than a silent guess. Parsing happens on the server only; the output
// is a typed AST that post-body.tsx renders to React and html.ts renders to
// strings for the RSS feed, so the two can never disagree about meaning.
//
// Blocks:   ## / ### headings, paragraphs, - / * and 1. lists, > quotes,
//           ``` code fences, ![alt](src) images on their own line, --- rules.
// Inlines:  **strong**, *em* / _em_, `code`, [text](href), and two
//           cross-references into the dataset:
//             [[show:2021-07-03]]        → /shows/2021-07-03
//             [[song:hot-tea|Hot Tea]]   → /songs/hot-tea  (label optional)
//
// No raw HTML, ever — text is text. That is what makes the renderer safe
// without a sanitizer.

import { formatShortDate } from "@/lib/queries/format";

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; children: Inline[] }
  | { kind: "em"; children: Inline[] }
  | { kind: "link"; href: string; children: Inline[] }
  | { kind: "show-ref"; date: string; label: string | null }
  | { kind: "song-ref"; slug: string; label: string | null };

export type Block =
  | { kind: "heading"; level: 2 | 3; id: string; children: Inline[] }
  | { kind: "paragraph"; children: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "quote"; paragraphs: Inline[][] }
  | { kind: "code"; lang: string | null; text: string }
  | { kind: "image"; src: string; alt: string }
  | { kind: "rule" };

/* ---------------- inline grammar ---------------- */

const ESCAPABLE = new Set(["\\", "`", "*", "_", "[", "]", "(", ")", "#", ">", "-", "|", "!"]);

// Only link targets we can vouch for: same-site paths, fragments, and the web.
const SAFE_HREF = /^(https?:\/\/|\/|#|mailto:)/;

const REF = /^\[\[(show|song):([^\]|]+)(?:\|([^\]]+))?\]\]/;
const LINK = /^\[([^\]]*)\]\(([^()\s]+)\)/;

/** Find `token` in `src` at or after `from`, skipping backslash-escaped hits. */
function findToken(src: string, token: string, from: number): number {
  let i = from;
  while (i <= src.length - token.length) {
    const at = src.indexOf(token, i);
    if (at === -1) return -1;
    if (src[at - 1] === "\\") {
      i = at + 1;
      continue;
    }
    return at;
  }
  return -1;
}

export function parseInlines(src: string): Inline[] {
  const out: Inline[] = [];
  let text = "";
  const flush = () => {
    if (text) out.push({ kind: "text", text });
    text = "";
  };

  let i = 0;
  while (i < src.length) {
    const ch = src[i];

    if (ch === "\\" && ESCAPABLE.has(src[i + 1])) {
      text += src[i + 1];
      i += 2;
      continue;
    }

    if (ch === "`") {
      const close = src.indexOf("`", i + 1);
      if (close !== -1) {
        flush();
        out.push({ kind: "code", text: src.slice(i + 1, close) });
        i = close + 1;
        continue;
      }
    }

    if (ch === "[" && src[i + 1] === "[") {
      const m = REF.exec(src.slice(i));
      if (!m) throw new Error(`malformed [[...]] reference at: "${src.slice(i, i + 40)}"`);
      const [whole, type, target, label] = m;
      if (type === "show" && !/^\d{4}-\d{2}-\d{2}$/.test(target)) {
        throw new Error(`[[show:...]] wants a YYYY-MM-DD date, got "${target}"`);
      }
      if (type === "song" && !/^[a-z0-9-]+$/.test(target)) {
        throw new Error(`[[song:...]] wants a lowercase slug, got "${target}"`);
      }
      flush();
      out.push(
        type === "show"
          ? { kind: "show-ref", date: target, label: label?.trim() ?? null }
          : { kind: "song-ref", slug: target, label: label?.trim() ?? null },
      );
      i += whole.length;
      continue;
    }

    if (ch === "[") {
      const m = LINK.exec(src.slice(i));
      if (m) {
        const [whole, inner, href] = m;
        if (!SAFE_HREF.test(href)) {
          throw new Error(`link target must be https?://, /path, #fragment or mailto: — got "${href}"`);
        }
        flush();
        out.push({ kind: "link", href, children: parseInlines(inner) });
        i += whole.length;
        continue;
      }
    }

    if (ch === "*" && src[i + 1] === "*") {
      let close = findToken(src, "**", i + 2);
      // `***` at the close belongs to the inner emphasis: `**bold *em***`
      // closes strong on the LAST star pair, leaving one star inside.
      if (close !== -1 && src[close + 2] === "*") close += 1;
      if (close !== -1) {
        flush();
        out.push({ kind: "strong", children: parseInlines(src.slice(i + 2, close)) });
        i = close + 2;
        continue;
      }
    }

    if (ch === "*") {
      const close = findToken(src, "*", i + 1);
      if (close !== -1 && close > i + 1) {
        flush();
        out.push({ kind: "em", children: parseInlines(src.slice(i + 1, close)) });
        i = close + 1;
        continue;
      }
    }

    // `_` opens emphasis only at a word edge, so snake_case survives outside
    // backticks.
    if (ch === "_" && !/[A-Za-z0-9]/.test(src[i - 1] ?? " ") && /\S/.test(src[i + 1] ?? "")) {
      const close = findToken(src, "_", i + 1);
      if (close !== -1) {
        flush();
        out.push({ kind: "em", children: parseInlines(src.slice(i + 1, close)) });
        i = close + 1;
        continue;
      }
    }

    text += ch;
    i += 1;
  }
  flush();
  return out;
}

/* ---------------- ref labels ---------------- */

/** "2021-07-03" → "Jul 3, 2021" — a show ref reads as its date unless labelled. */
export function showRefLabel(date: string): string {
  return formatShortDate(date);
}

/** "hot-tea" → "Hot Tea". A guess from the slug; authors override with `|label`. */
export function songRefLabel(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/* ---------------- block grammar ---------------- */

export function plainText(inlines: Inline[]): string {
  return inlines
    .map((n) => {
      switch (n.kind) {
        case "text":
        case "code":
          return n.text;
        case "strong":
        case "em":
        case "link":
          return plainText(n.children);
        case "show-ref":
          return n.label ?? showRefLabel(n.date);
        case "song-ref":
          return n.label ?? songRefLabel(n.slug);
      }
    })
    .join("");
}

function headingId(inlines: Inline[]): string {
  return plainText(inlines)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s-]+/g, "-");
}

const FENCE = /^```(\S*)\s*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^(?:---+|\*\*\*+)\s*$/;
const UL_ITEM = /^[-*]\s+(.*)$/;
const OL_ITEM = /^\d+\.\s+(.*)$/;
const IMAGE = /^!\[([^\]]*)\]\(([^()\s]+)\)\s*$/;
const QUOTE = /^>\s?(.*)$/;

function startsBlock(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    UL_ITEM.test(line) ||
    OL_ITEM.test(line) ||
    QUOTE.test(line) ||
    IMAGE.test(line)
  );
}

export function parseMarkdown(src: string): Block[] {
  const lines = src.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      if (i === lines.length) throw new Error("code fence ``` is never closed");
      i += 1; // closing fence
      blocks.push({ kind: "code", lang: fence[1] || null, text: buf.join("\n") });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1].length;
      if (level === 1) throw new Error("`#` is reserved for the post title (front matter) — start at `##`");
      if (level > 3) throw new Error("headings deeper than `###` aren't supported");
      const children = parseInlines(heading[2].trim());
      blocks.push({ kind: "heading", level: level as 2 | 3, id: headingId(children), children });
      i += 1;
      continue;
    }

    if (RULE.test(line)) {
      blocks.push({ kind: "rule" });
      i += 1;
      continue;
    }

    const image = IMAGE.exec(line);
    if (image) {
      const [, alt, srcUrl] = image;
      if (!SAFE_HREF.test(srcUrl)) {
        throw new Error(`image src must be https?:// or /path — got "${srcUrl}"`);
      }
      blocks.push({ kind: "image", src: srcUrl, alt });
      i += 1;
      continue;
    }

    if (QUOTE.test(line)) {
      const paragraphs: Inline[][] = [];
      let para: string[] = [];
      while (i < lines.length) {
        const q = QUOTE.exec(lines[i]);
        if (!q) break;
        if (q[1].trim() === "") {
          if (para.length) paragraphs.push(parseInlines(para.join(" ")));
          para = [];
        } else {
          para.push(q[1].trim());
        }
        i += 1;
      }
      if (para.length) paragraphs.push(parseInlines(para.join(" ")));
      blocks.push({ kind: "quote", paragraphs });
      continue;
    }

    const listMatch = UL_ITEM.exec(line) ?? OL_ITEM.exec(line);
    if (listMatch) {
      const ordered = OL_ITEM.test(line);
      const itemRe = ordered ? OL_ITEM : UL_ITEM;
      const items: Inline[][] = [];
      while (i < lines.length) {
        const m = itemRe.exec(lines[i]);
        if (m) {
          items.push(parseInlines(m[1].trim()));
          i += 1;
          // Hanging continuation: indented follow-on lines belong to the item.
          while (i < lines.length && /^\s{2,}\S/.test(lines[i])) {
            const cont = parseInlines(lines[i].trim());
            items[items.length - 1] = [...items[items.length - 1], { kind: "text", text: " " }, ...cont];
            i += 1;
          }
          continue;
        }
        break;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    // Paragraph: soft-wrapped lines fold into one, ending at a blank line or
    // the start of any other block.
    const para: string[] = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() !== "" && !startsBlock(lines[i])) {
      para.push(lines[i].trim());
      i += 1;
    }
    blocks.push({ kind: "paragraph", children: parseInlines(para.join(" ")) });
  }

  return blocks;
}

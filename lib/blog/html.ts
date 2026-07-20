// AST → HTML strings, for readers that never load our pages: the RSS feed.
// Every text node passes through escapeHtml, and the parser already refuses
// raw HTML and unsafe hrefs, so the output is inert by construction. Internal
// links come out absolute — a feed item has no base URL to resolve "/" against.

import { canonicalUrl } from "@/lib/site";
import { showRefLabel, songRefLabel, type Block, type CellAlign, type Inline } from "./markdown";

/** Feed readers don't load our CSS, so alignment rides inline on the cell. */
function cellStyle(align: CellAlign): string {
  return align === "left" ? "" : ` style="text-align:${align}"`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function absolute(href: string): string {
  return href.startsWith("/") ? canonicalUrl(href) : href;
}

function inlineHtml(nodes: Inline[]): string {
  return nodes
    .map((n) => {
      switch (n.kind) {
        case "text":
          return escapeHtml(n.text);
        case "code":
          return `<code>${escapeHtml(n.text)}</code>`;
        case "strong":
          return `<strong>${inlineHtml(n.children)}</strong>`;
        case "em":
          return `<em>${inlineHtml(n.children)}</em>`;
        case "link":
          return `<a href="${escapeHtml(absolute(n.href))}">${inlineHtml(n.children)}</a>`;
        case "show-ref":
          return `<a href="${escapeHtml(canonicalUrl(`/shows/${n.date}`))}">${escapeHtml(n.label ?? showRefLabel(n.date))}</a>`;
        case "song-ref":
          return `<a href="${escapeHtml(canonicalUrl(`/songs/${n.slug}`))}">${escapeHtml(n.label ?? songRefLabel(n.slug))}</a>`;
      }
    })
    .join("");
}

export function blocksToHtml(blocks: Block[]): string {
  return blocks
    .map((b) => {
      switch (b.kind) {
        case "heading":
          return `<h${b.level}>${inlineHtml(b.children)}</h${b.level}>`;
        case "paragraph":
          return `<p>${inlineHtml(b.children)}</p>`;
        case "list": {
          const tag = b.ordered ? "ol" : "ul";
          const items = b.items.map((it) => `<li>${inlineHtml(it)}</li>`).join("");
          return `<${tag}>${items}</${tag}>`;
        }
        case "quote":
          return `<blockquote>${b.paragraphs.map((p) => `<p>${inlineHtml(p)}</p>`).join("")}</blockquote>`;
        case "code":
          return `<pre><code>${escapeHtml(b.text)}</code></pre>`;
        case "table": {
          const th = b.header
            .map((cell, j) => `<th${cellStyle(b.align[j])}>${inlineHtml(cell)}</th>`)
            .join("");
          const trs = b.rows
            .map(
              (row) =>
                `<tr>${row.map((cell, j) => `<td${cellStyle(b.align[j])}>${inlineHtml(cell)}</td>`).join("")}</tr>`,
            )
            .join("");
          return `<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`;
        }
        case "image":
          return `<p><img src="${escapeHtml(absolute(b.src))}" alt="${escapeHtml(b.alt)}"></p>`;
        case "rule":
          return "<hr>";
      }
    })
    .join("\n");
}

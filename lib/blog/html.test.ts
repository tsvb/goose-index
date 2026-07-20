import { describe, it, expect } from "vitest";
import { parseMarkdown } from "./markdown";
import { blocksToHtml, escapeHtml } from "./html";
import { SITE_URL } from "@/lib/site";

describe("blocksToHtml (feed renderer)", () => {
  it("renders the block set to plain semantic HTML", () => {
    const html = blocksToHtml(
      parseMarkdown("## Head\n\npara with **bold**\n\n- a\n- b\n\n> quoted\n\n```\ncode\n```\n\n---"),
    );
    expect(html).toBe(
      [
        "<h2>Head</h2>",
        "<p>para with <strong>bold</strong></p>",
        "<ul><li>a</li><li>b</li></ul>",
        "<blockquote><p>quoted</p></blockquote>",
        "<pre><code>code</code></pre>",
        "<hr>",
      ].join("\n"),
    );
  });

  it("escapes text nodes — the parser admits no HTML and the renderer emits none", () => {
    const html = blocksToHtml(parseMarkdown("tags like <em> stay & read as text"));
    expect(html).toBe("<p>tags like &lt;em&gt; stay &amp; read as text</p>");
  });

  it("internal links and refs come out absolute — feed items have no base URL", () => {
    const html = blocksToHtml(parseMarkdown("see [[show:2021-07-03]] and [[song:hot-tea]] and [stats](/stats)"));
    expect(html).toContain(`<a href="${SITE_URL}/shows/2021-07-03">Jul 3, 2021</a>`);
    expect(html).toContain(`<a href="${SITE_URL}/songs/hot-tea">Hot Tea</a>`);
    expect(html).toContain(`<a href="${SITE_URL}/stats">stats</a>`);
    // External targets stay themselves.
    expect(blocksToHtml(parseMarkdown("[el](https://elgoose.net)"))).toContain('href="https://elgoose.net"');
  });

  it("tables render for the feed with alignment inline — feed readers have no CSS", () => {
    const html = blocksToHtml(parseMarkdown("| Hotel | GA |\n|---|---:|\n| Ocean | $1,668.14 |"));
    expect(html).toBe(
      '<table><thead><tr><th>Hotel</th><th style="text-align:right">GA</th></tr></thead>' +
        '<tbody><tr><td>Ocean</td><td style="text-align:right">$1,668.14</td></tr></tbody></table>',
    );
  });

  it("escapeHtml covers the four characters XML/HTML care about", () => {
    expect(escapeHtml(`<a href="x">&</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
});

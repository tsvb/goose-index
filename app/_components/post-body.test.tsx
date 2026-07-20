import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PostBody } from "./post-body";
import { parseMarkdown } from "@/lib/blog/markdown";

function render(md: string): string {
  return renderToStaticMarkup(<PostBody blocks={parseMarkdown(md)} />);
}

describe("PostBody", () => {
  it("renders the block set as semantic HTML inside .post-prose", () => {
    const html = render("## Head\n\npara\n\n- item\n\n> quote\n\n```\ncode()\n```\n\n---");
    expect(html).toContain('class="post-prose"');
    expect(html).toContain('<h2 id="head">Head</h2>');
    expect(html).toContain("<p>para</p>");
    expect(html).toContain("<li>item</li>");
    expect(html).toContain("<blockquote><p>quote</p></blockquote>");
    expect(html).toContain("<pre><code>code()</code></pre>");
    expect(html).toContain("<hr/>");
  });

  it("show and song refs become internal links with honest default labels", () => {
    const html = render("about [[show:2021-07-03]] and [[song:hot-tea]] and [[song:arrow|the arrow jam]]");
    expect(html).toContain('href="/shows/2021-07-03"');
    expect(html).toContain(">Jul 3, 2021</a>");
    expect(html).toContain('href="/songs/hot-tea"');
    expect(html).toContain(">Hot Tea</a>");
    expect(html).toContain(">the arrow jam</a>");
  });

  it("markup in text stays text — React escapes, the parser admits no HTML", () => {
    const html = render("a <script>alert(1)</script> tag");
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("tables render as thead/tbody; right-aligned columns wear the num class", () => {
    const html = render("| Hotel | GA |\n|---|---:|\n| Ocean | $1,668.14 |");
    expect(html).toContain("<thead>");
    expect(html).toContain("<th>Hotel</th>");
    expect(html).toContain('<th class="num">GA</th>');
    expect(html).toContain("<td>Ocean</td>");
    expect(html).toContain('<td class="num">$1,668.14</td>');
  });

  it("external links carry rel=noopener, internal ones are Next links", () => {
    const html = render("[el](https://elgoose.net) and [stats](/stats)");
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('href="/stats"');
  });
});

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BBCodeBody, BBCodeInline } from "./bbcode-render";

const render = (source: string) => renderToStaticMarkup(<BBCodeBody source={source} />);

describe("BBCodeBody", () => {
  it("renders the tag set", () => {
    const html = render("[b]b[/b] [i]i[/i] [u]u[/u] [s]s[/s]\nnew line");
    expect(html).toContain("<strong>b</strong>");
    expect(html).toContain("<em>i</em>");
    expect(html).toContain("<s>s</s>");
    expect(html).toContain("<br/>");
  });

  it("escapes HTML in text — the XSS corpus stays inert", () => {
    for (const evil of [
      "<script>alert(1)</script>",
      '<img src=x onerror=alert(1)>',
      "[b]<script>x</script>[/b]",
      "[code]<script>x</script>[/code]",
      "&lt;already&gt; &amp; entities",
    ]) {
      const html = render(evil);
      expect(html).not.toContain("<script");
      expect(html).not.toContain("<img");
    }
  });

  it("refuses non-http(s) link schemes", () => {
    for (const evil of ["javascript:alert(1)", "data:text/html,x", "vbscript:x", "JAVASCRIPT:alert(1)"]) {
      const html = render(`[url=${evil}]click[/url]`);
      expect(html).not.toContain("<a");
      expect(html).toContain("click");
    }
  });

  it("renders safe links with nofollow ugc", () => {
    const html = render("[url=https://elgoose.net]source[/url]");
    expect(html).toContain('href="https://elgoose.net"');
    expect(html).toContain('rel="nofollow ugc"');
  });

  it("renders quotes with attribution and code verbatim", () => {
    const html = render("[quote=Tim]honk[/quote][code][b]x[/b][/code]");
    expect(html).toContain("Tim said:");
    expect(html).toContain("<blockquote");
    expect(html).toContain("[b]x[/b]"); // code kept literal (escaped)
  });
});

describe("BBCodeInline", () => {
  it("allows b/i/url only; blocks stay literal", () => {
    const html = renderToStaticMarkup(<BBCodeInline source="[b]x[/b] [quote]q[/quote]" />);
    expect(html).toContain("<strong>x</strong>");
    expect(html).toContain("[quote]q[/quote]");
    expect(html).not.toContain("<blockquote");
  });
});

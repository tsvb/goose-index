import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SectionHeader } from "./section-header";

describe("SectionHeader", () => {
  it("renders the eyebrow, an h2 title, and the see-all link", () => {
    const html = renderToStaticMarkup(
      <SectionHeader eyebrow="Freshly logged" title="Latest shows" href="/shows" linkLabel="Browse all shows" />,
    );
    expect(html).toContain("Freshly logged");
    expect(html).toMatch(/<h2[^>]*>Latest shows<\/h2>/);
    expect(html).toContain('href="/shows"');
    expect(html).toContain("Browse all shows");
  });

  it("omits the link when no href is given", () => {
    const html = renderToStaticMarkup(<SectionHeader title="Latest shows" />);
    expect(html).not.toContain("<a");
  });

  it("wraps the title block in the almanac-masthead hook", () => {
    // The two letterpress themes hang their double rule off this class in
    // globals.css; here it must simply be present (and style-free) always.
    const html = renderToStaticMarkup(<SectionHeader eyebrow="E" title="T" />);
    expect(html).toContain('<div class="almanac-masthead">');
  });
});

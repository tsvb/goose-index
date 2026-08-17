import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PageHead, FilterLink, FilterRow, FolioNav, NilState } from "./page-chrome";

describe("PageHead", () => {
  it("renders a lowercase kicker, exactly one h1, and a mono meta line", () => {
    const html = renderToStaticMarkup(
      <PageHead kicker="shows" title="All shows" meta="823 shows since 1991" />,
    );
    expect(html).toContain("lowercase");
    expect(html).toContain("shows");
    expect(html.match(/<h1[^>]*>/g)?.length).toBe(1);
    expect(html).toMatch(/<h1[^>]*>All shows<\/h1>/);
    expect(html).toContain("823 shows since 1991");
    expect(html).toContain("font-mono");
  });
  it("omits the kicker and meta paragraphs when absent", () => {
    const html = renderToStaticMarkup(<PageHead title="Just a title" />);
    expect(html).not.toContain("text-faint");
    expect(html).toMatch(/<h1[^>]*>Just a title<\/h1>/);
  });
  it("stays flat — no card classes", () => {
    const html = renderToStaticMarkup(<PageHead kicker="k" title="t" meta="m" />);
    expect(html).not.toMatch(/rounded|surface-card/);
  });
});

describe("FilterLink", () => {
  it("active carries steel and semibold", () => {
    const html = renderToStaticMarkup(
      <FilterLink href="/shows?year=2026" active>
        2026
      </FilterLink>,
    );
    expect(html).toContain("text-steel");
    expect(html).toContain("font-semibold");
  });
  it("inactive carries neither", () => {
    const html = renderToStaticMarkup(
      <FilterLink href="/shows?year=2025" active={false}>
        2025
      </FilterLink>,
    );
    expect(html).not.toContain("text-steel");
    expect(html).not.toContain("font-semibold");
    expect(html).toContain("text-muted");
  });
  it("stays flat — no card classes", () => {
    const html = renderToStaticMarkup(
      <FilterLink href="/x" active>
        x
      </FilterLink>,
    );
    expect(html).not.toMatch(/rounded|surface-card/);
  });
});

describe("FilterRow", () => {
  it("wraps its links with an optional lowercase mono label", () => {
    const html = renderToStaticMarkup(
      <FilterRow label="tour">
        <FilterLink href="/a" active>
          a
        </FilterLink>
      </FilterRow>,
    );
    expect(html).toContain("tour");
    expect(html).toContain("lowercase");
  });
  it("no label, no label span", () => {
    const html = renderToStaticMarkup(
      <FilterRow>
        <FilterLink href="/a" active={false}>
          a
        </FilterLink>
      </FilterRow>,
    );
    expect(html).not.toMatch(/rounded|surface-card/);
  });
});

describe("FolioNav", () => {
  it("both hrefs render two links and the center text", () => {
    const html = renderToStaticMarkup(
      <FolioNav prevHref="/shows/page/1" nextHref="/shows/page/3" center="page 2 of 17" />,
    );
    expect(html.match(/<a /g)?.length).toBe(2);
    expect(html).toContain('href="/shows/page/1"');
    expect(html).toContain('href="/shows/page/3"');
    expect(html).toContain("page 2 of 17");
    expect(html).toContain("← previous");
    expect(html).toContain("next →");
  });
  it("a missing prevHref keeps the slot but disables it — no <a> on that side", () => {
    const html = renderToStaticMarkup(<FolioNav nextHref="/shows/page/2" center="page 1 of 17" />);
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("← previous");
    expect(html.match(/<a /g)?.length).toBe(1);
    // the disabled span (with "previous") precedes the only real <a> (the "next" link).
    expect(html.indexOf('aria-disabled="true"')).toBeLessThan(html.indexOf("<a "));
  });
  it("a missing nextHref keeps the slot but disables it — no <a> on that side", () => {
    const html = renderToStaticMarkup(<FolioNav prevHref="/shows/page/2" center="page 3 of 17" />);
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain("next →");
    expect(html.match(/<a /g)?.length).toBe(1);
    // the only real <a> (the "previous" link) precedes the disabled span.
    expect(html.indexOf("<a ")).toBeLessThan(html.indexOf('aria-disabled="true"'));
  });
  it("stays flat — no card classes", () => {
    const html = renderToStaticMarkup(<FolioNav prevHref="/a" nextHref="/b" />);
    expect(html).not.toMatch(/rounded|surface-card/);
  });
});

describe("NilState", () => {
  it("reads as a nil sentence ending in an em dash", () => {
    const html = renderToStaticMarkup(<NilState>no shows match these filters</NilState>);
    expect(html).toContain("no shows match these filters");
    expect(html).toContain("—");
  });
  it("offers the optional clear link", () => {
    const html = renderToStaticMarkup(
      <NilState href="/shows" linkLabel="clear filters">
        no shows match these filters
      </NilState>,
    );
    expect(html).toContain('href="/shows"');
    expect(html).toContain("clear filters");
    expect(html).toContain("text-spruce");
  });
  it("no href or linkLabel, no link", () => {
    const html = renderToStaticMarkup(<NilState>nothing here</NilState>);
    expect(html).not.toContain("<a");
  });
  it("stays flat — no card classes", () => {
    const html = renderToStaticMarkup(<NilState>nothing here</NilState>);
    expect(html).not.toMatch(/rounded|surface-card/);
  });
});

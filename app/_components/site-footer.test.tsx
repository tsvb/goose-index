import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FooterMinimal, FooterFunctional, FooterFancy } from "./site-footer";

describe("SiteFooter variants", () => {
  it("minimal is one plain line with the elgoose credit and no logo", () => {
    const html = renderToStaticMarkup(<FooterMinimal />);
    expect(html).not.toContain("<svg");
    expect(html).toContain("elgoose.net");
    expect(html).not.toContain("Browse");
  });
  it("fancy keeps the multi-column footer with Browse", () => {
    const html = renderToStaticMarkup(<FooterFancy />);
    expect(html).toContain("Browse");
    expect(html).toContain("<svg");
  });
  it("functional is a single slim mono row", () => {
    const html = renderToStaticMarkup(<FooterFunctional />);
    expect(html).toContain("w2-appbar");
    expect(html).not.toContain("Browse");
  });
});

describe("SiteFooter edition line", () => {
  it("fancy names the 3.0 edition and points at the gear", () => {
    const html = renderToStaticMarkup(<FooterFancy />);
    expect(html).toContain("3.0");
    expect(html).toContain("gear in the header");
    expect(html).toContain("2.0 (glossy)");
    expect(html).toContain("1.0 (plain)");
  });
  it("functional names the 2.0 edition and its alternatives", () => {
    const html = renderToStaticMarkup(<FooterFunctional />);
    expect(html).toContain("2.0 edition");
    expect(html).toContain("3.0 (themed)");
    expect(html).toContain("1.0 (plain)");
  });
  it("minimal names the 1.0 edition and points at the Settings link", () => {
    const html = renderToStaticMarkup(<FooterMinimal />);
    expect(html).toContain("1.0 (plain) edition");
    expect(html).toContain("Settings link in the header");
  });
});

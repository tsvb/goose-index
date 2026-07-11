import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { HeaderFancy, HeaderFunctional, HeaderMinimal } from "./site-header";

const nav = { pathname: "/" };

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: () => {},
    push: () => {},
  }),
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  nav.pathname = "/";
});

describe("SiteHeader variants", () => {
  it("fancy has the feather logo mark and is sticky", () => {
    const html = renderToStaticMarkup(<HeaderFancy experience="fancy" />);
    expect(html).toContain("<svg");
    expect(html).toContain("sticky");
  });
  it("functional is slim and mono, no rounded logo mark", () => {
    const html = renderToStaticMarkup(<HeaderFunctional experience="functional" />);
    expect(html).toContain("w2-appbar");
    expect(html).not.toContain("h-16");
  });
  it("minimal is a plain text nav: no svg, not sticky, underlined links", () => {
    const html = renderToStaticMarkup(<HeaderMinimal experience="minimal" />);
    expect(html).not.toContain("<svg");
    expect(html).not.toContain("sticky");
    expect(html).toContain("underline");
    expect(html).toContain("Shows");
  });
});

describe("SiteHeader current-section state", () => {
  it("fancy marks the current section gold with aria-current, on detail pages too", () => {
    nav.pathname = "/shows/2025-06-25";
    const html = renderToStaticMarkup(<HeaderFancy experience="fancy" />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page" class="[^"]*text-gold[^"]*" href="\/shows"/);
  });

  it("functional marks the current section with aria-current (styling via w2 CSS)", () => {
    nav.pathname = "/songs";
    const html = renderToStaticMarkup(<HeaderFunctional experience="functional" />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page" class="w2-navlink[^"]*" href="\/songs"/);
  });

  it("minimal marks the current section bold with aria-current, including Search", () => {
    nav.pathname = "/search";
    const html = renderToStaticMarkup(<HeaderMinimal experience="minimal" />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page" class="underline font-semibold" href="\/search"/);
  });

  it("marks nothing on pages outside the nav sections", () => {
    nav.pathname = "/";
    const html = renderToStaticMarkup(<HeaderFancy experience="fancy" />);
    expect(html).not.toContain("aria-current");
  });
});

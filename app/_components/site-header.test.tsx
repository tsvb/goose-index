import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import fs from "node:fs";
import path from "node:path";
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
  it("fancy masthead: lowercase wordmark, text nav, pen rule, no cards", () => {
    const html = renderToStaticMarkup(<HeaderFancy experience="fancy" />);
    expect(html).toContain("goose index");
    for (const label of ["shows", "songs", "stats", "on this day", "venues", "tours", "blog"]) {
      expect(html.toLowerCase()).toContain(label);
    }
    expect(html).toContain("text-pencil"); // the pen rule under the masthead
    // The wordmark link itself carries no badge — SettingsMenu's gear button
    // legitimately keeps rounded-full (it's a real icon-circle control, not a
    // decorative card).
    const wordmark = html.match(/<a[^>]*href="\/"[^>]*>[^<]*<\/a>/)?.[0];
    expect(wordmark).not.toContain("rounded-full"); // the feather badge is gone
    expect(html).not.toContain("backdrop-blur");
  });
  it("functional is slim and mono, no rounded logo mark", () => {
    const html = renderToStaticMarkup(<HeaderFunctional experience="functional" />);
    expect(html).toContain("w2-appbar");
    expect(html).not.toContain("h-16");
  });
  it("functional's inline SearchBox carries the appbar-search hook the white-on-gel CSS rule targets", () => {
    // Pins the fix for the mobile-sheet white-on-white bug: the appbar's own
    // input reskin (globals.css) must be scoped to this hook, not to every
    // `input` under .w2-appbar — MobileNav renders inside this same header.
    const html = renderToStaticMarkup(<HeaderFunctional experience="functional" />);
    expect(html).toContain("appbar-search");
  });
  it("the functional appbar's input-color CSS rule (and its ::placeholder twin) is scoped to .appbar-search, not every input under .w2-appbar", () => {
    const css = fs.readFileSync(path.join(__dirname, "..", "globals.css"), "utf8");
    expect(css).toMatch(/\[data-experience="functional"\]\s+\.w2-appbar\s+\.appbar-search\s+input\s*\{/);
    expect(css).toMatch(/\[data-experience="functional"\]\s+\.w2-appbar\s+\.appbar-search\s+input::placeholder\s*\{/);
    // The old bare-selector forms must be gone, not just shadowed by new rules.
    expect(css).not.toMatch(/\[data-experience="functional"\]\s+\.w2-appbar\s+input\s*\{/);
    expect(css).not.toMatch(/\[data-experience="functional"\]\s+\.w2-appbar\s+input::placeholder\s*\{/);
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
  it("fancy marks the current section with aria-current, on detail pages too", () => {
    nav.pathname = "/shows/2025-06-25";
    const html = renderToStaticMarkup(<HeaderFancy experience="fancy" />);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/aria-current="page" class="[^"]*text-steel[^"]*" href="\/shows"/);
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

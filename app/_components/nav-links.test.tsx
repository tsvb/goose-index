import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NavLink, isNavActive } from "./nav-links";

const nav = { pathname: "/" };

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
}));

describe("isNavActive", () => {
  it("matches the section root exactly", () => {
    expect(isNavActive("/shows", "/shows")).toBe(true);
  });

  it("matches detail pages inside the section", () => {
    expect(isNavActive("/shows/2025-06-25", "/shows")).toBe(true);
    expect(isNavActive("/songs/jive-ii", "/songs")).toBe(true);
  });

  it("never matches siblings or lookalike prefixes", () => {
    expect(isNavActive("/songs", "/shows")).toBe(false);
    expect(isNavActive("/showstoppers", "/shows")).toBe(false);
    expect(isNavActive("/", "/shows")).toBe(false);
  });
});

describe("NavLink", () => {
  it("marks the current section with aria-current and the active class", () => {
    nav.pathname = "/shows/2025-06-25";
    const html = renderToStaticMarkup(
      <NavLink href="/shows" className="base" activeClassName="is-active" inactiveClassName="is-idle">
        Shows
      </NavLink>,
    );
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('class="base is-active"');
    expect(html).not.toContain("is-idle");
  });

  it("renders other sections without aria-current, with the inactive class", () => {
    nav.pathname = "/shows/2025-06-25";
    const html = renderToStaticMarkup(
      <NavLink href="/songs" className="base" activeClassName="is-active" inactiveClassName="is-idle">
        Songs
      </NavLink>,
    );
    expect(html).not.toContain("aria-current");
    expect(html).toContain('class="base is-idle"');
  });

  it("leaves the class list untouched when no state class is given", () => {
    nav.pathname = "/tours/5";
    const html = renderToStaticMarkup(
      <NavLink href="/tours" className="w2-navlink">
        Tours
      </NavLink>,
    );
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('class="w2-navlink"');
  });
});

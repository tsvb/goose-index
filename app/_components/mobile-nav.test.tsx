import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({ forcedOpen: false }));

// The drawer only renders when `open` is true, and the node test environment
// can't click the trigger. Flip MobileNav's first useState(false) — the open
// flag — to true so the drawer's markup is renderable; every other hook runs
// untouched.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = ((init: unknown) => {
    if (init === false && !h.forcedOpen) {
      h.forcedOpen = true;
      return actual.useState(true);
    }
    return actual.useState(init);
  }) as typeof actual.useState;
  return { ...actual, useState };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => "/",
}));

import { MobileNav } from "./mobile-nav";

beforeEach(() => {
  h.forcedOpen = false;
});

describe("MobileNav drawer", () => {
  it("mentions songs in the search placeholder", () => {
    const html = renderToStaticMarkup(<MobileNav />);
    expect(html).toContain('placeholder="Search songs, shows, venues…"');
  });

  it("renders the section links", () => {
    const html = renderToStaticMarkup(<MobileNav />);
    expect(html).toContain('href="/songs"');
    expect(html).toContain('href="/shows"');
  });
});

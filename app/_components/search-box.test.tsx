import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({ qs: "", path: "/search" }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  useSearchParams: () => new URLSearchParams(h.qs),
  usePathname: () => h.path,
}));

import { SearchBox } from "./search-box";

beforeEach(() => {
  h.qs = "";
  h.path = "/search";
});

describe("SearchBox", () => {
  it("seeds the full-size input from the URL's q param", () => {
    h.qs = "q=rise";
    const html = renderToStaticMarkup(<SearchBox size="full" />);
    expect(html).toContain('value="rise"');
  });

  it("seeds the compact header box too", () => {
    h.qs = "q=rise";
    const html = renderToStaticMarkup(<SearchBox />);
    expect(html).toContain('value="rise"');
  });

  it("stays empty when there is no q param", () => {
    const html = renderToStaticMarkup(<SearchBox size="full" />);
    expect(html).toContain('value=""');
  });

  it("ignores q params on other pages (e.g. the /songs name filter)", () => {
    h.qs = "q=tea";
    h.path = "/songs";
    const html = renderToStaticMarkup(<SearchBox />);
    expect(html).toContain('value=""');
  });

  it("mentions songs in the full-size placeholder", () => {
    const html = renderToStaticMarkup(<SearchBox size="full" />);
    expect(html).toContain("Try a song, a date (2022-06-24), a venue, or a city…");
  });

  it("keeps the compact placeholder terse", () => {
    const html = renderToStaticMarkup(<SearchBox />);
    expect(html).toContain('placeholder="Search…"');
  });
});

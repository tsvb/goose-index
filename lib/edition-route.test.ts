import { describe, it, expect } from "vitest";
import { editionRoute } from "./edition-route";

// 2026-11-20 at noon ET: outside the live window (3pm–4am ET).
const NOON = new Date("2026-11-20T17:00:00Z");
// 2026-11-20 at 9pm ET: inside it, for the show dated 2026-11-20.
const NINE_PM = new Date("2026-11-21T02:00:00Z");

const q = (s = "") => new URLSearchParams(s);

describe("editionRoute", () => {
  it("puts every page under its edition, defaulting to 3.0 (fancy)", () => {
    expect(editionRoute("/", q(), undefined, NOON).pathname).toBe("/edition/fancy");
    expect(editionRoute("/stats/debuts", q(), undefined, NOON).pathname).toBe("/edition/fancy/stats/debuts");
    expect(editionRoute("/venues/303", q(), "minimal", NOON).pathname).toBe("/edition/minimal/venues/303");
    expect(editionRoute("/tours", q(), "functional", NOON).pathname).toBe("/edition/functional/tours");
  });

  it("treats an unknown cookie value as the default edition", () => {
    expect(editionRoute("/years", q(), "bogus", NOON).pathname).toBe("/edition/fancy/years");
  });

  it("keeps the query string on pages that still read it", () => {
    expect(editionRoute("/songs", q("sort=gap"), undefined, NOON)).toEqual({ pathname: "/edition/fancy/songs", drop: [] });
    expect(editionRoute("/search", q("q=tumble"), undefined, NOON).drop).toEqual([]);
  });

  it("moves a song's ?page= into the path, and page 1 to the plain song", () => {
    expect(editionRoute("/songs/hot-tea", q("page=3"), undefined, NOON)).toEqual({ pathname: "/edition/fancy/songs/hot-tea/p/3", drop: ["page"] });
    expect(editionRoute("/songs/hot-tea", q("page=1"), undefined, NOON).pathname).toBe("/edition/fancy/songs/hot-tea");
    expect(editionRoute("/songs/hot-tea", q("page=abc"), undefined, NOON).pathname).toBe("/edition/fancy/songs/hot-tea");
    expect(editionRoute("/songs/hot-tea", q(), "minimal", NOON)).toEqual({ pathname: "/edition/minimal/songs/hot-tea", drop: ["page"] });
  });

  it("moves a show's ?n= into the path, and n=1 to the plain show", () => {
    expect(editionRoute("/shows/2025-06-25", q("n=2"), undefined, NOON)).toEqual({ pathname: "/edition/fancy/shows/2025-06-25/n/2", drop: ["n"] });
    expect(editionRoute("/shows/2025-06-25", q("n=1"), undefined, NOON).pathname).toBe("/edition/fancy/shows/2025-06-25");
    expect(editionRoute("/shows/2025-06-25", q("n=-1"), undefined, NOON).pathname).toBe("/edition/fancy/shows/2025-06-25");
  });

  it("sends tonight's show to the per-request live route only inside the window, keeping ?n=", () => {
    expect(editionRoute("/shows/2026-11-20", q("n=2"), undefined, NINE_PM)).toEqual({ pathname: "/edition/fancy/shows/2026-11-20/live", drop: [] });
    expect(editionRoute("/shows/2026-11-20", q(), undefined, NOON).pathname).toBe("/edition/fancy/shows/2026-11-20");
    expect(editionRoute("/shows/2026-11-19", q(), undefined, NINE_PM).pathname).toBe("/edition/fancy/shows/2026-11-19");
  });

  it("re-prefixes a hand-typed /edition/ URL, so it 404s instead of serving a duplicate", () => {
    expect(editionRoute("/edition/fancy/tours", q(), undefined, NOON).pathname).toBe("/edition/fancy/edition/fancy/tours");
  });
});

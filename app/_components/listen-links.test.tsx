import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ListenLinksContent, type ListenExample } from "./listen-links";
import { nugsShowHref, nugsTrackHref, nugsWebFallback } from "@/lib/nugs";

// renderToStaticMarkup escapes &, < and > in text nodes (and & in attributes).
// The applenugs:// URLs carry &, and the dev-section grammar carries < and > —
// every toContain against rendered output must go through this.
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const example: ListenExample = {
  date: "2024-04-20", venue: "The Salt Shed", containerId: 46887, song: "Hot Tea",
};
const coverage = { resolved: 476, total: 855 };

const render = (experience: "minimal" | "functional" | "fancy", ex: ListenExample | null = example, cov = coverage as { resolved: number; total: number } | null) =>
  renderToStaticMarkup(<ListenLinksContent experience={experience} example={ex} coverage={cov} />);

describe("ListenLinksContent", () => {
  it("renders one h1 in every edition", () => {
    for (const e of ["minimal", "functional", "fancy"] as const) {
      const html = render(e);
      expect(html.match(/<h1/g)).toHaveLength(1);
      expect(html).toContain("How the listen links work");
    }
  });

  it("prints the URL the real helper builds — same code path as the buttons", () => {
    const html = render("fancy");
    expect(html).toContain(esc(nugsShowHref({ date: example.date, venue: example.venue })));
    expect(html).toContain(esc(nugsShowHref({ date: example.date, venue: example.venue, media: "video" })));
    expect(html).toContain(esc(nugsTrackHref({ date: example.date, venue: example.venue, song: "Hot Tea" })));
  });

  it("encodes a space as %20 and never as +", () => {
    const html = render("minimal");
    expect(html).toContain("The%20Salt%20Shed");
    expect(html).not.toContain("The+Salt+Shed");
  });

  it("the try-it link falls back to the exact release when the container is known", () => {
    const html = render("fancy");
    expect(html).toContain(`data-fallback="${nugsWebFallback({ date: example.date, venue: example.venue, containerId: 46887 })}"`);
    expect(html).toContain("https://play.nugs.net/release/46887");
  });

  it("the try-it link falls back to the search when no container is known", () => {
    const html = render("fancy", { ...example, containerId: null });
    expect(html).toContain(esc(nugsWebFallback({ date: example.date, venue: example.venue, containerId: null })));
    expect(html).not.toContain("play.nugs.net/release/");
  });

  it("with no example, the explanation renders and the try-it block is gone", () => {
    const html = render("fancy", null);
    expect(html).toContain("How the listen links work");
    // Not "applenugs://show/" bare — Task 3's grammar line legitimately contains
    // that prefix. A real example URL always has a date, which starts with a digit.
    expect(html).not.toContain("applenugs://show/2");
  });

  it("with no song, the track-level example drops out", () => {
    const html = render("fancy", { ...example, song: null });
    // Not "song=" bare — Task 3's parameter table legitimately contains
    // "song=<title>". The concrete track URL is what must be gone.
    expect(html).not.toContain(esc(nugsTrackHref({ date: example.date, venue: example.venue, song: "Hot Tea" })));
    expect(html).not.toContain("song=Hot%20Tea");
    expect(html).toContain(esc(nugsShowHref({ date: example.date, venue: example.venue })));
  });

  it("states coverage as a computed fraction, and omits it without data", () => {
    expect(render("fancy")).toContain("476 of 855");
    expect(render("fancy", example, null)).not.toContain("link straight to their page");
  });

  it("never claims playability or a post-sign-in return", () => {
    for (const e of ["minimal", "functional", "fancy"] as const) {
      const html = render(e).toLowerCase();
      expect(html).not.toContain("you can play");
      expect(html).not.toContain("returns you to");
    }
  });

  it("the developer reference is collapsed on styled editions, plain on minimal", () => {
    expect(render("fancy")).toContain("<details");
    expect(render("functional")).toContain("<details");
    const minimal = render("minimal");
    expect(minimal).not.toContain("<details");
    expect(minimal).toContain("How the links are built");
  });

  it("documents the grammar, the %20 rule with its reason, and the repo", () => {
    const html = render("minimal");
    expect(html).toContain(esc("applenugs://show/<YYYY-MM-DD>?artist=<name>"));
    expect(html).toContain("%20");
    expect(html).toContain("URLComponents");   // the reason, not just the rule
    expect(html).toContain("github.com/tsvb/applenugs");
  });

  it("renders the parameter table as a real table in every edition", () => {
    for (const e of ["minimal", "functional", "fancy"] as const) {
      const html = render(e);
      expect(html).toContain("<table");
      expect(html).toContain("venue=");
    }
  });
});

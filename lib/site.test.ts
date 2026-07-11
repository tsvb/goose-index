import { describe, it, expect } from "vitest";
import type { ResolvedMetadata } from "next";
import { SITE_URL, canonicalUrl, entityMetadata } from "./site";

const asParent = (v: unknown) => v as ResolvedMetadata;

describe("canonicalUrl", () => {
  it("prefixes the www origin", () => {
    expect(canonicalUrl("/shows/2024-08-07")).toBe(`${SITE_URL}/shows/2024-08-07`);
  });
  it("preserves query params when the caller passes them", () => {
    expect(canonicalUrl("/shows/2024-08-07?n=2")).toBe(`${SITE_URL}/shows/2024-08-07?n=2`);
  });
  it("handles the root", () => {
    expect(canonicalUrl("/")).toBe(`${SITE_URL}/`);
  });
});

describe("entityMetadata", () => {
  const parent = { openGraph: { images: [{ url: `${SITE_URL}/opengraph-image` }] } };

  it("declares the canonical link at the given path", () => {
    const m = entityMetadata({ title: "T", description: "D", path: "/songs/hot-tea", parent: asParent(parent) });
    expect(m.alternates.canonical).toBe(`${SITE_URL}/songs/hot-tea`);
  });

  it("rebuilds openGraph so page-level replacement keeps site_name/type/url and the parent's images", () => {
    const m = entityMetadata({ title: "Hot Tea", description: "D", path: "/songs/hot-tea", parent: asParent(parent) });
    expect(m.openGraph.title).toBe("Hot Tea");
    expect(m.openGraph.siteName).toBe("Goose Index");
    expect(m.openGraph.type).toBe("website");
    expect(m.openGraph.url).toBe(`${SITE_URL}/songs/hot-tea`);
    expect(m.openGraph.images).toEqual([{ url: `${SITE_URL}/opengraph-image` }]);
  });

  it("canonical and openGraph url match — same string, not two independent formats", () => {
    const m = entityMetadata({ title: "T", description: "D", path: "/shows/2024-08-07?n=2", parent: asParent(parent) });
    expect(m.alternates.canonical).toBe(m.openGraph.url);
  });

  it("survives a parent with no images (never crashes on the file-convention miss)", () => {
    const m = entityMetadata({ title: "T", description: "D", path: "/x", parent: asParent({}) });
    expect(m.openGraph.images).toBeUndefined();
    expect(m.alternates.canonical).toBe(`${SITE_URL}/x`);
  });
});

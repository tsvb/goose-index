import { describe, expect, it } from "vitest";
import NextLink from "next/link";
import Link from "./link";

describe("Link", () => {
  it("is next/link with prefetching off", () => {
    const el = Link({ href: "/songs/hot-tea", children: "Hot Tea" });
    expect(el.type).toBe(NextLink);
    expect(el.props).toMatchObject({ href: "/songs/hot-tea", prefetch: false, children: "Hot Tea" });
  });

  it("lets a caller ask for prefetching back", () => {
    expect(Link({ href: "/shows", prefetch: true }).props.prefetch).toBe(true);
  });
});

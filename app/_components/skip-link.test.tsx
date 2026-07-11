import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SkipLink } from "./skip-link";

describe("SkipLink", () => {
  it("links to the #main landmark", () => {
    const html = renderToStaticMarkup(<SkipLink />);
    expect(html).toContain('href="#main"');
    expect(html).toContain("Skip to content");
  });
  it("is visually hidden until focused (sr-only reveal pattern)", () => {
    const html = renderToStaticMarkup(<SkipLink />);
    expect(html).toContain("sr-only");
    expect(html).toContain("focus:not-sr-only");
  });
});

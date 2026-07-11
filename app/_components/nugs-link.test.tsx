import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { NugsLink, isPlainLeftClick } from "./nugs-link";

describe("NugsLink", () => {
  it("renders the applenugs href, carries the fallback, and children", () => {
    const html = renderToStaticMarkup(
      <NugsLink
        href="applenugs://show/2024-04-20?artist=Goose"
        fallback="https://play.nugs.net/#/search?searchTerm=Goose%202024-04-20"
        className="nugs-track"
        title="Listen on nugs"
      >▷</NugsLink>,
    );
    expect(html).toContain('href="applenugs://show/2024-04-20?artist=Goose"');
    expect(html).toContain('data-fallback="https://play.nugs.net/#/search?searchTerm=Goose%202024-04-20"');
    expect(html).toContain("nugs-track");
    expect(html).toContain("▷");
  });
  it("emits a descriptive aria-label when given one", () => {
    const html = renderToStaticMarkup(
      <NugsLink
        href="applenugs://show/2024-04-20?artist=Goose&song=Hot%20Tea"
        fallback="https://play.nugs.net/"
        ariaLabel="Listen to Hot Tea on nugs"
      >▷</NugsLink>,
    );
    expect(html).toContain('aria-label="Listen to Hot Tea on nugs"');
  });
});

describe("isPlainLeftClick — the fallback must not hijack modified clicks", () => {
  const plain = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 };
  it("accepts an unmodified left click", () => {
    expect(isPlainLeftClick(plain)).toBe(true);
  });
  it.each([
    ["metaKey", { ...plain, metaKey: true }],
    ["ctrlKey", { ...plain, ctrlKey: true }],
    ["shiftKey", { ...plain, shiftKey: true }],
    ["altKey", { ...plain, altKey: true }],
    ["middle button", { ...plain, button: 1 }],
    ["right button", { ...plain, button: 2 }],
  ])("rejects %s", (_name, e) => {
    expect(isPlainLeftClick(e)).toBe(false);
  });
});

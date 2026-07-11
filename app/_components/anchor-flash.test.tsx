import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnchorFlash, flashAnchor, samePageHash } from "./anchor-flash";

vi.mock("next/navigation", () => ({
  usePathname: () => "/shows",
  useSearchParams: () => new URLSearchParams(),
}));

/** Minimal stand-in for a .show-anchor element (node tests run without a DOM). */
function makeEl(classes: string[] = ["show-anchor"]) {
  const set = new Set(classes);
  const animations: string[] = [];
  const el = {
    animations,
    reflows: 0,
    classList: {
      contains: (c: string) => set.has(c),
      add: (c: string) => void set.add(c),
      remove: (c: string) => void set.delete(c),
    },
    has: (c: string) => set.has(c),
    style: {
      set animation(v: string) {
        animations.push(v);
      },
      get animation() {
        return animations[animations.length - 1] ?? "";
      },
    },
    get offsetWidth() {
      el.reflows += 1;
      return 0;
    },
  };
  return el;
}

function makeDoc(el: ReturnType<typeof makeEl> | null) {
  return { getElementById: (id: string) => (id === "show-42" ? el : null) };
}

describe("flashAnchor", () => {
  it("adds the flash class to the addressed show anchor", () => {
    const el = makeEl();
    flashAnchor(makeDoc(el), "#show-42");
    expect(el.has("show-anchor-flash")).toBe(true);
  });

  it("restarts the animation via an inline reset and a reflow in between", () => {
    const el = makeEl(["show-anchor", "show-anchor-flash"]);
    flashAnchor(makeDoc(el), "#show-42");
    expect(el.animations).toEqual(["none", ""]);
    expect(el.reflows).toBe(1);
    expect(el.has("show-anchor-flash")).toBe(true);
  });

  it("ignores an empty hash and missing elements", () => {
    expect(() => flashAnchor(makeDoc(null), "")).not.toThrow();
    expect(() => flashAnchor(makeDoc(null), "#show-42")).not.toThrow();
    expect(() => flashAnchor(makeDoc(makeEl()), "#show-7")).not.toThrow();
  });

  it("leaves non-anchor elements alone", () => {
    const el = makeEl(["some-other-block"]);
    flashAnchor(makeDoc(el), "#show-42");
    expect(el.has("show-anchor-flash")).toBe(false);
    expect(el.animations).toEqual([]);
  });
});

const loc = { pathname: "/shows", search: "", href: "http://x.test/shows" };
const plainClick = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0 };
const clickOn = (href: string | null) => ({
  ...plainClick,
  target: href === null ? null : { closest: () => ({ getAttribute: () => href }) },
});

describe("samePageHash", () => {
  it("returns the hash for a link that only changes the hash", () => {
    expect(samePageHash(clickOn("/shows#show-42"), loc)).toBe("#show-42");
    expect(samePageHash(clickOn("#show-42"), loc)).toBe("#show-42");
  });

  it("returns null when the path or query changes (the router effect owns those)", () => {
    expect(samePageHash(clickOn("/shows?page=2#show-42"), loc)).toBe(null);
    expect(samePageHash(clickOn("/songs#show-42"), loc)).toBe(null);
    expect(samePageHash(clickOn("/shows#show-42"), { ...loc, search: "?page=2", href: "http://x.test/shows?page=2" })).toBe(null);
  });

  it("returns null without a hash, a link, or a target", () => {
    expect(samePageHash(clickOn("/shows"), loc)).toBe(null);
    expect(samePageHash({ ...plainClick, target: { closest: () => null } }, loc)).toBe(null);
    expect(samePageHash(clickOn(null), loc)).toBe(null);
  });

  it("leaves modified clicks (new tab etc.) alone", () => {
    expect(samePageHash({ ...clickOn("/shows#show-42"), metaKey: true }, loc)).toBe(null);
    expect(samePageHash({ ...clickOn("/shows#show-42"), ctrlKey: true }, loc)).toBe(null);
    expect(samePageHash({ ...clickOn("/shows#show-42"), button: 1 }, loc)).toBe(null);
  });
});

describe("AnchorFlash", () => {
  it("renders nothing", () => {
    expect(renderToStaticMarkup(<AnchorFlash />)).toBe("");
  });
});

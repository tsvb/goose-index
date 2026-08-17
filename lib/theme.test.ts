import { describe, it, expect } from "vitest";
import { THEME_VALUES, PINNED_THEMES, DEFAULT_THEME, resolveTheme, themeScript } from "./theme";

// The theme model is three-valued: auto (follow the system — the default and
// the absence of a data-theme attribute) plus the two pins, fog and slate.
// The pre-paint script applies only pins; auto must NOT set an attribute, or
// the prefers-color-scheme media query could never decide.
describe("theme", () => {
  it("defaults to auto, which is a real option", () => {
    expect(DEFAULT_THEME).toBe("auto");
    expect(THEME_VALUES).toContain(DEFAULT_THEME);
  });

  it("pins are exactly fog and slate, and both survive a reload", () => {
    expect([...PINNED_THEMES]).toEqual(["fog", "slate"]);
    for (const t of PINNED_THEMES) {
      expect(themeScript).toContain(`t==='${t}'`);
    }
  });

  it("the pre-paint script never pins auto", () => {
    expect(themeScript).not.toContain("t==='auto'");
    expect(themeScript).toContain("localStorage.getItem('ga-theme')");
    expect(themeScript).toContain("setAttribute('data-theme'");
  });

  it("rejects junk and the five retired theme names", () => {
    for (const legacy of ["xl2", "pod", "registrar", "light", "dark"]) {
      expect(resolveTheme(legacy)).toBeNull();
    }
    expect(resolveTheme("")).toBeNull();
    expect(resolveTheme(null)).toBeNull();
    expect(resolveTheme(undefined)).toBeNull();
    expect(resolveTheme("fog; drop table")).toBeNull();
  });
});

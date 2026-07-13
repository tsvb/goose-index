import { describe, it, expect } from "vitest";
import { THEME_VALUES, DEFAULT_THEME, resolveTheme, themeScript } from "./theme";

// A theme has to be known in three places at once: the menu that offers it, the
// pre-paint script that re-applies it, and the SSR default. Adding XL II and
// missing one of them is the drift these pin down.
describe("theme", () => {
  it("defaults to a theme the site actually ships", () => {
    expect(THEME_VALUES).toContain(DEFAULT_THEME);
    expect(resolveTheme(DEFAULT_THEME)).toBe(DEFAULT_THEME);
  });

  it("lets every theme survive a reload", () => {
    // The allowlist is generated from THEME_VALUES, so this holds by
    // construction — but assert it, because the failure is silent: a theme
    // missing from the script is saved on click and ignored on the next load,
    // and the visitor's choice quietly reverts to the default.
    for (const t of THEME_VALUES) {
      expect(themeScript).toContain(`t==='${t}'`);
    }
  });

  it("re-applies the saved theme before first paint", () => {
    expect(themeScript).toContain("localStorage.getItem('ga-theme')");
    expect(themeScript).toContain("setAttribute('data-theme'");
  });

  it("rejects anything that isn't a theme", () => {
    expect(resolveTheme("sepia")).toBeNull();
    expect(resolveTheme("")).toBeNull();
    expect(resolveTheme(null)).toBeNull();
    expect(resolveTheme(undefined)).toBeNull();
    // Not a value someone can smuggle into the DOM attribute.
    expect(resolveTheme("xl2; drop table")).toBeNull();
  });
});

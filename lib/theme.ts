export type Theme = "dark" | "light" | "pod" | "xl2";

/** Every theme the site ships. Order is the order the menu shows them in. */
export const THEME_VALUES: Theme[] = ["dark", "light", "pod", "xl2"];

/** What a visitor sees before they've ever chosen one. The SSR `data-theme`
 * attribute and the menu's initial state both read this, so they can't drift
 * apart and flash the wrong theme on first paint. */
export const DEFAULT_THEME: Theme = "xl2";

/** Narrow an untrusted value (localStorage, DOM attribute) to a Theme. */
export function resolveTheme(value: string | null | undefined): Theme | null {
  return THEME_VALUES.includes(value as Theme) ? (value as Theme) : null;
}

/** Re-applies a saved theme before first paint, so a visitor who chose one
 * other than DEFAULT_THEME never sees the default flash first.
 *
 * The allowlist is *generated* from THEME_VALUES rather than written out by
 * hand. A theme missing from it would be saved on click and then silently
 * ignored on the next load — the visitor's choice quietly reverting — which is
 * precisely the kind of drift that bites when a theme is added months later. */
export const themeScript = `(function(){try{var t=localStorage.getItem('ga-theme');if(${THEME_VALUES.map(
  (v) => `t==='${v}'`,
).join("||")}){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

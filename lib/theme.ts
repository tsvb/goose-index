export type Theme = "auto" | "fog" | "slate";

/** Every appearance the menu offers. Auto follows prefers-color-scheme. */
export const THEME_VALUES: Theme[] = ["auto", "fog", "slate"];

/** The two values that may appear in the data-theme attribute. Auto is the
 * *absence* of the attribute — setting it would override the media query. */
export const PINNED_THEMES = ["fog", "slate"] as const;

export const DEFAULT_THEME: Theme = "auto";

/** Narrow an untrusted value (localStorage, DOM attribute) to a Theme. */
export function resolveTheme(value: string | null | undefined): Theme | null {
  return THEME_VALUES.includes(value as Theme) ? (value as Theme) : null;
}

/** Re-applies a saved pin before first paint. The allowlist is generated from
 * PINNED_THEMES so a pin can't be saved on click and ignored on reload. */
export const themeScript = `(function(){try{var t=localStorage.getItem('ga-theme');if(${PINNED_THEMES.map(
  (v) => `t==='${v}'`,
).join("||")}){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

/** Keyboard escape hatch past the sticky header — rendered as the first child
 *  of <body> so it's the very first tab stop on every page, in every
 *  experience. Visually hidden (sr-only) until keyboard focus reveals it
 *  pinned over the header; the global gold :focus-visible ring applies. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:border focus:border-line focus:bg-surface focus:px-4 focus:py-2.5 focus:font-mono focus:text-xs focus:text-ink"
    >
      Skip to content
    </a>
  );
}

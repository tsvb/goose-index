"use client";

import type { MouseEvent, ReactNode } from "react";

/** Only a plain left-click should arm the web fallback — modified clicks
 *  (new tab, new window, download) must keep their native behavior instead
 *  of having the current tab redirected out from under them. */
export function isPlainLeftClick(e: {
  metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button: number;
}): boolean {
  return !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey && e.button === 0;
}

/**
 * Anchor to an `applenugs://` deep link. On click it lets the browser attempt the
 * scheme; if the app doesn't take focus shortly, it sends the user to the web
 * fallback. If the app opens, the page is backgrounded → the fallback is cancelled.
 * Progressive enhancement: with JS off, the anchor still attempts the scheme.
 */
export function NugsLink({
  href, fallback, className, title, ariaLabel, children,
}: { href: string; fallback: string; className?: string; title?: string; ariaLabel?: string; children: ReactNode }) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (!isPlainLeftClick(e)) return;
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    window.addEventListener("blur", cancel, { once: true });
    document.addEventListener("visibilitychange", cancel, { once: true });
    window.setTimeout(() => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", cancel);
      if (!cancelled && document.visibilityState === "visible") {
        window.location.href = fallback;
      }
    }, 1200);
  }
  return (
    <a href={href} title={title} aria-label={ariaLabel} className={className} data-fallback={fallback} onClick={handleClick}>
      {children}
    </a>
  );
}

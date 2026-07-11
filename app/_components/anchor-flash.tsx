"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const FLASH_CLASS = "show-anchor-flash";

/**
 * Play the .show-anchor flash on the element the hash points at. The CSS
 * :target rule covers full loads, but Next's client-side navigations go
 * through pushState, which never re-evaluates :target — so this applies the
 * equivalent class (see globals.css). Typed structurally and exported so the
 * node tests can drive it without a DOM.
 */
export function flashAnchor(
  doc: {
    getElementById(id: string): {
      classList: { contains(c: string): boolean; add(c: string): void; remove(c: string): void };
      style: { animation: string };
      offsetWidth: number;
    } | null;
  },
  hash: string,
): void {
  const id = hash.replace(/^#/, "");
  if (!id) return;
  const el = doc.getElementById(id);
  if (!el || !el.classList.contains("show-anchor")) return;
  // Restart the animation even when the class (or a stale :target) already
  // applied it: blank it inline, force a reflow, then let the class re-apply.
  el.classList.remove(FLASH_CLASS);
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "";
  el.classList.add(FLASH_CLASS);
}

/**
 * The hash from a plain left-click on a link that stays on the current page
 * (same path and query). Those navigations go through pushState with nothing
 * for the effects below to observe — no hashchange, no router-dep change —
 * so the click itself has to trigger the flash. Exported for the node tests.
 */
export function samePageHash(
  e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; button: number; target: unknown },
  loc: { pathname: string; search: string; href: string },
): string | null {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return null;
  const target = e.target as { closest?: (sel: string) => { getAttribute(name: string): string | null } | null } | null;
  const a = target?.closest?.("a[href]");
  const href = a?.getAttribute("href");
  if (!href) return null;
  const url = new URL(href, loc.href);
  if (!url.hash || url.pathname !== loc.pathname || url.search !== loc.search) return null;
  return url.hash;
}

function AnchorFlashInner() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  // Router navigations (the jump link changing ?page= plus the hash) re-run
  // this via the deps. Every path stays a no-op under prefers-reduced-motion —
  // the CSS gates the animation as well.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    flashAnchor(document, window.location.hash);
  }, [pathname, search]);

  // Native hash jumps (and back/forward between hashes) fire hashchange;
  // same-page pushState navigations are caught at the click.
  useEffect(() => {
    function onHashChange() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      flashAnchor(document, window.location.hash);
    }
    function onClick(e: MouseEvent) {
      const hash = samePageHash(e, window.location);
      if (!hash) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // After the frame in which Next commits the URL and scrolls.
      requestAnimationFrame(() => flashAnchor(document, hash));
    }
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return null;
}

// useSearchParams requires a Suspense boundary if the page is ever prerendered
// (same guard SearchBox uses); the component renders nothing either way.
export function AnchorFlash() {
  return (
    <Suspense fallback={null}>
      <AnchorFlashInner />
    </Suspense>
  );
}

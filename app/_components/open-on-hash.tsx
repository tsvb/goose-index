"use client";

import { useEffect } from "react";

/** Opens the <details> the URL hash points at, on load and on every hash
 * change, so a jump-row link or a shared #g-co URL lands on an open group
 * instead of a closed summary. Renders nothing. */
export function OpenOnHash() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) el.open = true;
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}

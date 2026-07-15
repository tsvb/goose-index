"use client";

import { quoteBBCode } from "@/lib/forum/quote";

/** JS: insert into the composer. No JS: follow the ?quote= fallback link. */
export function QuoteButton({ author, body, fallbackHref }: { author: string; body: string; fallbackHref: string }) {
  return (
    <a href={fallbackHref} className="text-muted hover:underline"
      onClick={(e) => {
        const ta = document.getElementById("composer-body") as HTMLTextAreaElement | null;
        if (!ta) return; // no composer on the page (locked/signed out) — follow the link
        e.preventDefault();
        const quoted = quoteBBCode(author, body);
        ta.value = ta.value ? `${ta.value}\n${quoted}` : quoted;
        ta.focus();
      }}>
      Quote
    </a>
  );
}

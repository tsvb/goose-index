"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, Search } from "./marks";

const NAV = [
  { href: "/shows", label: "Shows" },
  { href: "/songs", label: "Songs" },
  { href: "/stats", label: "Stats" },
  { href: "/on-this-day", label: "On This Day" },
  { href: "/venues", label: "Venues" },
  { href: "/tours", label: "Tours" },
  { href: "/blog", label: "Blog" },
];

// Document-level behavior while the sheet is open: Escape dismisses it (the
// settings popover's contract) and the page behind stays put. Returns the
// cleanup; exported so the node tests can drive it without a DOM.
export function bindSheetDismissal(doc: Document, close: () => void): () => void {
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") close();
  }
  doc.addEventListener("keydown", onKey);
  const prevOverflow = doc.body.style.overflow;
  doc.body.style.overflow = "hidden";
  return () => {
    doc.removeEventListener("keydown", onKey);
    doc.body.style.overflow = prevOverflow;
  };
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    return bindSheetDismissal(document, () => {
      setOpen(false);
      triggerRef.current?.focus();
    });
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) {
      setOpen(false);
      router.push(`/search?q=${encodeURIComponent(term)}`);
    }
  }

  return (
    <div className="md:hidden">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:border-gold hover:text-gold"
      >
        {open ? <X className="h-[18px] w-[18px]" /> : <Menu className="h-[18px] w-[18px]" />}
      </button>

      {open && (
        <>
          {/* Offsets track the live header's height via --header-h, set per
              experience on each <header> (fancy h-16, functional h-12). */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 top-[var(--header-h,4rem)] z-30 cursor-default bg-bg-deep/50"
          />
          <div className="fixed inset-x-0 top-[var(--header-h,4rem)] z-40 max-h-[calc(100dvh-var(--header-h,4rem))] overflow-y-auto overscroll-contain border-b border-line bg-bg shadow-[0_24px_48px_-20px_var(--shadow)]">
            <div className="space-y-5 px-5 py-6">
              <form onSubmit={submit} className="group relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint group-focus-within:text-gold" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search songs, shows, venues…"
                  aria-label="Search the index"
                  className="w-full rounded-full border border-line bg-surface py-3 pl-10 pr-4 text-ink placeholder:text-faint outline-none focus:border-gold"
                />
              </form>
              <nav className="flex flex-col">
                {NAV.map((n) => {
                  const active = pathname === n.href || pathname.startsWith(n.href + "/");
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className={`border-b border-line-soft py-3 font-display text-xl last:border-0 ${
                        active ? "text-gold" : "text-ink"
                      }`}
                    >
                      {n.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

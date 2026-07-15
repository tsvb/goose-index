import Link from "next/link";
import { clsx } from "@/app/_components/clsx";

/** Classic windowed pagination: 1 … c−2 c−1 [c] c+1 c+2 … last. */
export function Pager({ current, total, href }: { current: number; total: number; href: (page: number) => string }) {
  if (total <= 1) return null;
  const pages: number[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 2) pages.push(p);
  }
  const items: (number | "gap")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push("gap");
    items.push(p);
  });
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center gap-1 font-mono text-xs">
      {items.map((it, i) =>
        it === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-faint">…</span>
        ) : (
          <Link key={it} href={href(it)} aria-current={it === current ? "page" : undefined}
            className={clsx("border border-line px-2 py-0.5", it === current ? "font-bold text-ink" : "text-muted hover:text-ink")}>
            {it}
          </Link>
        ),
      )}
    </nav>
  );
}

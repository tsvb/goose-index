import type { ReactNode } from "react";
import { Container } from "./container";
import { clsx } from "./clsx";

/* Ledger-style loading placeholders. Deliberately experience-neutral: they
 * render only from the shared tokens (surface, line, line-soft), which every
 * experience and theme re-skins, so one skeleton reads correctly in all three
 * editions. The shimmer is Tailwind's pulse, stilled under
 * prefers-reduced-motion. */

/** A shimmering faint bar — the skeleton's only mark. */
export function SkeletonBar({ className }: { className?: string }) {
  return <span aria-hidden className={clsx("block animate-pulse rounded bg-line-soft motion-reduce:animate-none", className)} />;
}

/** Announces the pending page to assistive tech while the bars shimmer. */
export function SkeletonPage({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">{label}…</span>
      {children}
    </div>
  );
}

/** Echo of the page hero: eyebrow, display line, count line. */
export function SkeletonHeader() {
  return (
    <div className="border-b border-line">
      <Container className="py-12 sm:py-16">
        <SkeletonBar className="h-3 w-40" />
        <SkeletonBar className="mt-4 h-10 w-72 max-w-full" />
        <SkeletonBar className="mt-4 h-3 w-52 max-w-full" />
      </Container>
    </div>
  );
}

/** Hairline-separated ledger rows inside a surface card. */
export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="surface-card overflow-hidden">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className={clsx("flex items-center gap-4 px-5 py-4", i > 0 && "border-t border-line-soft")}>
          <SkeletonBar className="h-3 w-16 shrink-0" />
          <SkeletonBar className="h-3 w-full max-w-56" />
          <SkeletonBar className="ml-auto h-3 w-24 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** A row of filter-pill ghosts. */
export function SkeletonPills({ count = 8 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonBar key={i} className="h-7 w-16 rounded-full" />
      ))}
    </div>
  );
}

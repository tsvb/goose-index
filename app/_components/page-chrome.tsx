import Link from "next/link";
import { clsx } from "./clsx";

/** Page opening: lowercase kicker, the title, a mono meta line. No rules,
 * no glow, no motion — sections below start with their own SectionRule. */
export function PageHead({
  kicker,
  title,
  meta,
  children,
}: {
  kicker?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="pt-10 pb-6 sm:pt-14">
      {kicker && <p className="text-[0.7rem] lowercase text-faint">{kicker}</p>}
      <h1 className="mt-1 text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
        {title}
      </h1>
      {meta && <p className="mt-2 font-mono text-[0.75rem] text-faint">{meta}</p>}
      {children}
    </div>
  );
}

/** One text filter. Active wears steel; nothing is a pill. */
export function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "font-mono text-xs lowercase underline underline-offset-4 transition",
        active ? "font-semibold text-steel" : "text-muted hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

/** A labeled row of filter links. */
export function FilterRow({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
      {label && <span className="font-mono text-[0.62rem] lowercase text-faint">{label}</span>}
      {children}
    </div>
  );
}

/** Folio pagination line: ← previous · page 2 of 17 · next →. A missing side
 * keeps its slot (aria-disabled) so the line never jumps. */
export function FolioNav({
  prevHref,
  nextHref,
  prevLabel = "previous",
  nextLabel = "next",
  center,
}: {
  prevHref?: string | null;
  nextHref?: string | null;
  prevLabel?: string;
  nextLabel?: string;
  center?: React.ReactNode;
}) {
  return (
    <nav className="flex items-baseline justify-between gap-4 font-mono text-xs lowercase">
      {prevHref ? (
        <Link href={prevHref} className="text-muted underline underline-offset-4 hover:text-ink">
          ← {prevLabel}
        </Link>
      ) : (
        <span aria-disabled="true" className="select-none text-faint opacity-60">← {prevLabel}</span>
      )}
      {center && <span className="text-faint">{center}</span>}
      {nextHref ? (
        <Link href={nextHref} className="text-muted underline underline-offset-4 hover:text-ink">
          {nextLabel} →
        </Link>
      ) : (
        <span aria-disabled="true" className="select-none text-faint opacity-60">{nextLabel} →</span>
      )}
    </nav>
  );
}

/** A nil entry, not an empty box. */
export function NilState({
  children,
  href,
  linkLabel,
}: {
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="py-12 text-center">
      <p className="text-muted">{children} —</p>
      {href && linkLabel && (
        <Link href={href} className="mt-3 inline-block text-sm lowercase text-spruce underline underline-offset-4 hover:text-ink">
          {linkLabel}
        </Link>
      )}
    </div>
  );
}

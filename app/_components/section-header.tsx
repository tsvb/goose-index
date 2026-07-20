import Link from "next/link";
import { ArrowRight } from "./marks";

export function SectionHeader({
  eyebrow,
  title,
  href,
  linkLabel = "See all",
}: {
  eyebrow?: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      {/* almanac-masthead: the two letterpress themes draw their double rule
          off this wrapper (globals.css); it carries no styles elsewhere. */}
      <div className="almanac-masthead">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="mt-1.5 font-display text-2xl text-ink sm:text-[1.7rem]">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group flex shrink-0 items-center gap-1.5 font-mono text-xs text-sage transition hover:text-ink"
        >
          {linkLabel}
          <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}

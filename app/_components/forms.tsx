import Link from "next/link";
import { Children } from "react";
import { PenRule } from "./pen";
import { clsx } from "./clsx";
import { showHref, dateParts, locationLine } from "@/lib/queries/format";
import type { ShowSummary } from "@/lib/queries/shows";

/** Section heading over the pen's strong rule. Chrome is lowercase; pass
 * authored content (venue names, dates) already cased as it should read. */
export function SectionRule({
  title,
  href,
  linkLabel = "see all",
  seed,
}: {
  title: React.ReactNode;
  href?: string;
  linkLabel?: string;
  seed: string;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-[0.8rem] font-semibold lowercase text-ink">{title}</h2>
        {href && (
          <Link
            href={href}
            className="shrink-0 text-[0.75rem] lowercase text-spruce underline underline-offset-4 transition hover:text-ink"
          >
            {linkLabel}
          </Link>
        )}
      </div>
      <PenRule seed={seed} className="mt-1" />
    </div>
  );
}

/** The ledger: entries separated by faint pen rules. The strong head rule
 * belongs to SectionRule, so a ledger composes under any heading. */
export function Ledger({ children, seed }: { children: React.ReactNode; seed: string }) {
  const items = Children.toArray(children);
  return (
    <div>
      {items.map((child, i) => (
        <div key={i}>
          {i > 0 && <PenRule seed={`${seed}-${i}`} strength="faint" />}
          {child}
        </div>
      ))}
    </div>
  );
}

/** One show, one line. The whole row is the link; hover underlines the
 * display slot. Meta reads nil ("—") over zero, per copy rule 1. */
export function LedgerEntry({ show, context }: { show: ShowSummary; context?: "venue" | "tour" }) {
  const dp = dateParts(show.date);
  const loc = locationLine(show.city, show.state, show.country);
  const onVenue = context === "venue";
  const month = dp.month.slice(0, 3).toLowerCase();
  const display = onVenue ? `${month} ${dp.day}, ${dp.year}` : (show.venue ?? "Unknown venue");
  const sub = onVenue ? (show.tour ?? dp.weekday.toLowerCase()) : loc;
  return (
    <Link
      href={showHref(show.date, show.order)}
      className={clsx(
        "group grid items-baseline gap-x-4 py-2.5",
        onVenue ? "grid-cols-[1fr_auto]" : "grid-cols-[5.6rem_1fr_auto]",
      )}
    >
      {!onVenue && (
        <span className="shrink-0">
          <span className="block font-mono text-[0.8rem] text-steel">{`${month} ${dp.day}`}</span>
          <span className="block font-mono text-[0.62rem] lowercase text-faint">
            {dp.weekday.slice(0, 3).toLowerCase()} · {dp.year}
          </span>
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[0.95rem] text-ink underline-offset-4 group-hover:underline">
          {display}
        </span>
        <span className="block truncate text-[0.8rem] text-muted">{sub || "—"}</span>
      </span>
      <span className="text-right font-mono text-[0.7rem] text-faint">
        {context !== "tour" && !onVenue && show.tour && (
          <span className="mb-0.5 hidden max-w-[14rem] truncate sm:block">{show.tour}</span>
        )}
        <span className="block">
          {show.songCount > 0 ? `${show.songCount} songs` : "—"}
          {show.hasNotes && <span className="ml-2 text-spruce">notes</span>}
        </span>
      </span>
    </Link>
  );
}

/** Tonight's show: the hand marks now. The dot is the site's one motion. */
export function TonightEntry({ show }: { show: ShowSummary }) {
  const loc = locationLine(show.city, show.state, show.country);
  return (
    <Link
      href={showHref(show.date, show.order)}
      className="group grid grid-cols-[5.6rem_1fr_auto] items-baseline gap-x-4 py-2.5"
    >
      <span className="flex items-center gap-1.5 font-mono text-[0.8rem] lowercase text-hand">
        tonight
        <span
          aria-hidden
          className="inline-block h-[0.45em] w-[0.45em] rounded-full bg-hand animate-pulse motion-reduce:animate-none"
        />
        {show.order != null && <span className="text-faint">· {show.order}</span>}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[0.95rem] text-ink underline-offset-4 group-hover:underline">
          {show.venue ?? "Unknown venue"}
        </span>
        <span className="block truncate text-[0.8rem] text-muted">{loc || "—"}</span>
      </span>
      <span className="text-right font-mono text-[0.7rem] lowercase text-faint">
        the setlist will appear live
      </span>
    </Link>
  );
}

/** One line of the contents: where a reader can go, and how much is there. */
export function ContentsRow({ href, label, sub }: { href: string; label: string; sub: string }) {
  return (
    <Link href={href} className="group flex items-baseline justify-between gap-4 py-2">
      <span className="lowercase text-ink underline-offset-4 group-hover:underline">{label}</span>
      <span className="text-right text-[0.8rem] text-muted">{sub}</span>
    </Link>
  );
}

/** A figure: the number, then its name. */
export function Figure({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-[1.6rem] font-semibold leading-tight text-ink [font-variant-numeric:tabular-nums]">
        {value}
      </span>
      <span className="text-[0.68rem] lowercase text-faint">{label}</span>
    </span>
  );
}

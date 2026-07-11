import Link from "next/link";
import { MapPin } from "./marks";
import { clsx } from "./clsx";
import { showHref, dateParts, locationLine } from "@/lib/queries/format";
import type { ShowSummary } from "@/lib/queries/shows";

/** Grid card — home, search, featured contexts. */
export function ShowCard({ show, className }: { show: ShowSummary; className?: string }) {
  const dp = dateParts(show.date);
  const loc = locationLine(show.city, show.state, show.country);
  return (
    <Link
      href={showHref(show.date, show.order)}
      className={clsx(
        "group flex flex-col rounded-lg border border-line bg-surface p-5 transition duration-200",
        "hover:-translate-y-0.5 hover:border-gold/55 hover:bg-surface-2 hover:shadow-[0_8px_30px_-12px_var(--shadow)]",
        className,
      )}
    >
      {show.tour && <span className="eyebrow mb-2 line-clamp-1">{show.tour}</span>}
      <div className="flex items-baseline gap-2">
        <span className="font-display text-2xl leading-none text-ink">
          {dp.month} {dp.day}
        </span>
        <span className="font-mono text-sm text-gold-soft">{dp.year}</span>
      </div>
      <span className="mt-1.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-faint">{dp.weekday}</span>
      <h3 className="mt-3 font-display text-lg leading-tight text-ink transition group-hover:text-gold">
        {show.venue ?? "Unknown venue"}
      </h3>
      <span className="mt-1 flex items-center gap-1.5 text-sm text-muted">
        <MapPin className="h-3.5 w-3.5 shrink-0 text-faint" /> {loc || "—"}
      </span>
      <div className="mt-4 flex items-center justify-between border-t border-line-soft pt-3 font-mono text-[0.7rem] text-faint">
        <span>{show.songCount > 0 ? `${show.songCount} songs` : "no setlist"}</span>
        {show.hasNotes && <span className="text-sage">notes</span>}
      </div>
    </Link>
  );
}

/**
 * Dense ledger row — browse lists, dimension pages.
 *
 * `context` keeps the row from repeating what its page already says:
 * on a venue page ("venue") the date takes the display slot and the tour
 * replaces the venue/location line; on a tour page ("tour") the repeated
 * tour eyebrow drops.
 */
export function ShowRow({ show, context }: { show: ShowSummary; context?: "venue" | "tour" }) {
  const dp = dateParts(show.date);
  const loc = locationLine(show.city, show.state, show.country);
  const onVenue = context === "venue";
  return (
    <Link
      href={showHref(show.date, show.order)}
      className={clsx(
        "group grid items-center gap-4 rounded-md border-b border-line-soft px-2 py-3.5 transition last:border-0 hover:bg-surface",
        onVenue ? "grid-cols-[1fr_auto]" : "grid-cols-[5.5rem_1fr_auto]",
      )}
    >
      {!onVenue && (
        <div className="shrink-0">
          <div className="font-mono text-sm tabular-nums text-gold-soft">{show.date}</div>
          <div className="font-mono text-[0.62rem] uppercase tracking-wider text-faint">{dp.weekday.slice(0, 3)}</div>
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-display text-base text-ink transition group-hover:text-gold">
          {onVenue ? `${dp.month} ${dp.day}, ${dp.year}` : (show.venue ?? "Unknown venue")}
        </div>
        <div className="truncate text-sm text-muted">{onVenue ? dp.weekday : (loc || "—")}</div>
      </div>
      <div className="text-right">
        {context !== "tour" && show.tour && (
          <div className="eyebrow mb-0.5 hidden max-w-[14rem] truncate sm:block">{show.tour}</div>
        )}
        <div className="font-mono text-[0.7rem] text-faint">
          {show.songCount > 0 ? `${show.songCount} songs` : "—"}
          {show.hasNotes && <span className="ml-2 text-sage">notes</span>}
        </div>
      </div>
    </Link>
  );
}

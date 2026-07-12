import Link from "next/link";
import type { DeepestVenueRow } from "@/lib/queries/discoveries";

/** Venues ranked by jam percentage. Bar reads left-to-right as the ratio; the
 * counts to the right anchor the sample size so a hot night can't fake depth. */
export function VenueDepth({ data }: { data: DeepestVenueRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No venues qualify yet.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.jamPercentage));
  return (
    <ol className="surface-card divide-y divide-line-soft">
      {data.map((v, i) => {
        const pct = Math.max(4, Math.round((v.jamPercentage / max) * 100));
        return (
          <li key={v.venueId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 p-4 sm:grid-cols-[1.5rem_minmax(0,1fr)_9rem_auto]">
            <span className="text-right font-mono text-xs text-faint tabular-nums">{i + 1}</span>
            <div className="min-w-0">
              {v.slug ? (
                <Link href={`/venues/${v.slug}`} className="truncate font-display text-ink hover:text-gold">
                  {v.name}
                </Link>
              ) : (
                <span className="truncate font-display text-ink">{v.name}</span>
              )}
              <p className="mt-0.5 font-mono text-[0.68rem] text-faint">
                {v.totalJams} jams · {v.totalPerformances} performances · {v.totalShows} shows
              </p>
            </div>
            <div className="hidden h-1 overflow-hidden rounded-full bg-line-soft sm:block" aria-hidden="true">
              <div className="h-full rounded-full bg-gold/60" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-right font-mono text-sm tabular-nums text-gold">
              {v.jamPercentage.toFixed(1)}
              <span className="ml-0.5 text-xs text-faint">%</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

import Link from "next/link";
import { formatShortDate } from "@/lib/queries/format";
import type { ShelfRow } from "@/lib/queries/discoveries";

/** Originals with the longest current gap. Sorted oldest-first, so
 * `data[0]` is always the reference for the width ratio. */
export function TheShelf({ data }: { data: ShelfRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No originals qualify yet.</p>;
  }
  const denom = Math.max(1, data[0].daysSincePlayed);
  return (
    <ol className="surface-card divide-y divide-line-soft">
      {data.map((song, i) => {
        const pct = Math.max(5, Math.round((song.daysSincePlayed / denom) * 100));
        return (
          <li key={song.songId} className="flex items-center gap-4 p-4">
            <span className="w-6 shrink-0 text-right font-mono text-xs text-faint tabular-nums">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                {song.slug ? (
                  <Link href={`/songs/${song.slug}`} className="truncate font-display text-ink hover:text-gold">
                    {song.name}
                  </Link>
                ) : (
                  <span className="truncate font-display text-ink">{song.name}</span>
                )}
                <span className="shrink-0 font-mono text-sm tabular-nums text-gold">
                  {song.daysSincePlayed}
                  <span className="ml-1 text-xs text-faint">days</span>
                </span>
              </div>
              <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-line-soft" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-gold/60"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3 font-mono text-[0.68rem] text-faint">
                <span>Last seen {formatShortDate(song.lastPlayedDate)}</span>
                <span>{song.totalPlays} plays</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

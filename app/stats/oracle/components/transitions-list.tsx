import Link from "next/link";
import type { TransitionRow } from "@/lib/queries/discoveries";

/** Ranked list of top segued transitions with a weight bar per row. */
export function TransitionsList({ data }: { data: TransitionRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No transitions found yet.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <ol className="surface-card divide-y divide-line-soft">
      {data.map((t, i) => {
        const pct = Math.max(6, Math.round((t.count / max) * 100));
        return (
          <li key={`${t.sourceName}->${t.targetName}`} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-3 p-4 sm:grid-cols-[1.5rem_minmax(0,1fr)_10rem_auto]">
            <span className="text-right font-mono text-xs text-faint tabular-nums">{i + 1}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <SongTag name={t.sourceName} slug={t.sourceSlug} />
                <span className="font-mono text-sm text-gold" aria-hidden="true">→</span>
                <SongTag name={t.targetName} slug={t.targetSlug} />
              </div>
            </div>
            <div className="hidden h-1 overflow-hidden rounded-full bg-line-soft sm:block" aria-hidden="true">
              <div className="h-full rounded-full bg-gold/60" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-right font-mono text-sm tabular-nums text-ink">
              {t.count}
              <span className="ml-1 text-xs text-faint">×</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function SongTag({ name, slug }: { name: string; slug: string | null }) {
  const cls = "truncate font-display text-ink hover:text-gold";
  return slug ? (
    <Link href={`/songs/${slug}`} className={cls}>{name}</Link>
  ) : (
    <span className={cls}>{name}</span>
  );
}

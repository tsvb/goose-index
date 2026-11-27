import Link from "@/app/_components/link";
import type { SongIndexRow } from "@/lib/queries/songs";
import { compact, formatShortDate, songHref } from "@/lib/queries/format";
import { DateTile, PlainTag } from "@/app/_components/yeti";
import { OverdueRing, Nil } from "./_hub";

/* 3.0's stats cuts, as the hub's shelves at full length (spec 2026-11-18,
 * round 7): each cut answers its one question in its own form, where the old
 * page dropped it into the catalog's eight-column table. Server components. */

const low = (iso: string) => formatShortDate(iso).toLowerCase();

function Name({ row }: { row: Pick<SongIndexRow, "name" | "slug" | "isOriginal"> }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Link href={songHref(row)} className="truncate font-extrabold text-ink underline-offset-4 hover:underline">
        {row.name}
      </Link>
      {!row.isOriginal && <PlainTag className="shrink-0">cover</PlainTag>}
    </span>
  );
}

function Level({ value, top }: { value: number; top: number }) {
  return (
    <span data-role="level" className="relative block h-1.5 rounded-full bg-[var(--frost)]" aria-hidden="true">
      <span className="absolute inset-y-0 left-0 rounded-full bg-steel" style={{ width: `${(value / Math.max(1, top)) * 100}%` }} />
    </span>
  );
}

/** Most played: a ranked ledger with level tracks; one line of the numbers the
 * table carried under each name. */
export function PlayedLedger({ rows }: { rows: SongIndexRow[] }) {
  if (rows.length === 0) return <Nil>No plays logged yet</Nil>;
  const top = rows[0].timesPlayed;
  return (
    <ol className="cut-ledger">
      {rows.map((r, i) => (
        <li key={r.songId} className="grid grid-cols-[1.8rem_minmax(0,15rem)_minmax(0,1fr)_2.8rem] items-center gap-2.5 border-t border-line py-2 max-sm:grid-cols-[1.6rem_minmax(0,1fr)_2.6rem]">
          <span className="text-right text-[0.75rem] tabular-nums text-faint">{i + 1}</span>
          <span className="grid min-w-0">
            <Name row={r} />
            <span className="truncate text-[0.75rem] text-muted">
              rotation {r.rotationPct}%{r.lastPlayedDate ? ` · last ${low(r.lastPlayedDate)}` : ""}
            </span>
          </span>
          <span className="max-sm:hidden">
            <Level value={r.timesPlayed} top={top} />
          </span>
          <span className="text-right font-extrabold tabular-nums text-ink">{compact(r.timesPlayed)}</span>
        </li>
      ))}
    </ol>
  );
}

function MiniRing({ gap, record }: { gap: number; record: number }) {
  const f = Math.max(Math.min(record > 0 ? gap / record : 0, 0.995), 0.012);
  const r = 38;
  const a = ((f * 360 - 90) * Math.PI) / 180;
  return (
    <svg viewBox="0 0 100 100" className="h-[22px] w-[22px]" aria-hidden="true">
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--frost)" strokeWidth={12} />
      <path
        d={`M50 12 A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`}
        fill="none"
        stroke="var(--foil)"
        strokeWidth={12}
        strokeLinecap="round"
      />
    </svg>
  );
}

/** How many of the longest gone get a ring tile; the rest are rows. */
const OVERDUE_TILES = 6;

/** Most overdue: the Shelf's rings — the longest gone as tiles, the rest as rows
 * with a small ring and the gap in foil (elapsed time). */
export function OverdueCut({ rows, record }: { rows: SongIndexRow[]; record: number }) {
  if (rows.length === 0) return <Nil>Nothing overdue</Nil>;
  const tiles = rows.slice(0, OVERDUE_TILES);
  const rest = rows.slice(OVERDUE_TILES);
  const facts = (r: SongIndexRow) =>
    `${r.isOriginal ? "" : "cover · "}${compact(r.timesPlayed)} plays${r.lastPlayedDate ? ` · last ${low(r.lastPlayedDate)}` : ""}`;
  return (
    <>
      <h2 className="mb-2.5 text-[0.9rem] font-extrabold text-muted">The longest gone</h2>
      <ol className="grid grid-cols-3 gap-3 lg:grid-cols-6">
        {tiles.map((r) => (
          <li key={r.songId} className="min-w-0">
            <Link href={songHref(r)} className="group grid min-w-0 gap-1">
              <span className="grid aspect-square w-full place-items-center rounded-[14px] bg-[var(--card-stock)] shadow-[inset_0_0_0_1px_var(--frost)]">
                <OverdueRing gap={r.currentGap ?? 0} record={record} />
              </span>
              <b className="truncate text-[0.85rem] font-extrabold text-ink underline-offset-4 group-hover:underline">{r.name}</b>
              <span className="text-[0.72rem] leading-snug text-muted">{facts(r)}</span>
            </Link>
          </li>
        ))}
      </ol>
      {rest.length > 0 && (
        <>
          <h2 className="mb-1 mt-6 text-[0.9rem] font-extrabold text-muted">Then</h2>
          <ol>
            {rest.map((r, i) => (
              <li key={r.songId} className="grid grid-cols-[1.8rem_22px_minmax(0,1fr)_3rem] items-center gap-2.5 border-t border-line py-2">
                <span className="text-right text-[0.75rem] tabular-nums text-faint">{OVERDUE_TILES + i + 1}</span>
                <MiniRing gap={r.currentGap ?? 0} record={record} />
                <span className="grid min-w-0">
                  <Name row={r} />
                  <span className="truncate text-[0.75rem] text-muted">
                    {compact(r.timesPlayed)} plays{r.lastPlayedDate ? ` · last ${low(r.lastPlayedDate)}` : ""}
                  </span>
                </span>
                <span className="text-right font-extrabold tabular-nums text-[var(--foil)]">{compact(r.currentGap ?? 0)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

const RARE_GROUP: Record<number, string> = { 1: "Played once", 2: "Played twice", 3: "Played three times" };

/** Rarities: grouped by how rare, newest return first in each group. */
export function RarityGroups({ rows }: { rows: SongIndexRow[] }) {
  if (rows.length === 0) return <Nil>No rarities yet</Nil>;
  const counts = [...new Set(rows.map((r) => r.timesPlayed))].sort((a, b) => a - b);
  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-3">
      {counts.map((n) => {
        const group = rows
          .filter((r) => r.timesPlayed === n)
          .sort((a, b) => (b.lastPlayedDate ?? "").localeCompare(a.lastPlayedDate ?? "") || a.name.localeCompare(b.name));
        return (
          <section key={n} className="min-w-0">
            <h2 className="mb-1 text-[0.9rem] font-extrabold text-muted">
              {RARE_GROUP[n] ?? `Played ${n} times`} <span className="font-bold text-faint">· {group.length}</span>
            </h2>
            <ol>
              {group.map((r) => (
                <li key={r.songId} className="grid min-w-0 border-t border-line py-2 text-[0.88rem]">
                  <Name row={r} />
                  <span className="truncate text-[0.75rem] text-muted">
                    {r.lastPlayedDate ? `last ${low(r.lastPlayedDate)}` : ""}
                    {r.currentGap != null ? ` · ${compact(r.currentGap)} shows since` : ""}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

type Debut = { slug: string; name: string; date: string; venue: string | null };

/** The latest debuts, grouped by the night they happened (a Goosemas can debut
 * six songs at once), in the order the query returns them. */
export function debutNights(rows: Debut[]): { date: string; venue: string | null; songs: Debut[] }[] {
  const nights: { date: string; venue: string | null; songs: Debut[] }[] = [];
  for (const d of rows) {
    const last = nights[nights.length - 1];
    if (last && last.date === d.date && last.venue === d.venue) last.songs.push(d);
    else nights.push({ date: d.date, venue: d.venue, songs: [d] });
  }
  return nights;
}

export function DebutNights({ rows }: { rows: Debut[] }) {
  if (rows.length === 0) return <Nil>No debuts logged yet</Nil>;
  return (
    <ol>
      {debutNights(rows).map((n) => (
        <li key={`${n.date}|${n.venue}`} className="grid grid-cols-[58px_minmax(0,1fr)] items-start gap-3 border-t border-line py-2.5">
          <DateTile iso={n.date} className="yeti-tile-sm w-[58px]" />
          <span className="grid min-w-0">
            <b className="truncate text-[0.92rem] font-extrabold text-ink">
              <span className="sr-only">{formatShortDate(n.date)} · </span>
              {n.venue ?? "Venue unknown"}
            </b>
            <span className="mt-1 flex flex-wrap gap-1.5">
              {n.songs.map((s) => (
                <Link
                  key={s.slug}
                  href={songHref(s)}
                  className="rounded-full bg-[rgba(233,238,247,0.06)] px-2 py-0.5 text-[0.8rem] font-bold text-ink shadow-[inset_0_0_0_1px_var(--frost)] transition hover:shadow-[inset_0_0_0_1px_var(--slush)]"
                >
                  {s.name}
                </Link>
              ))}
            </span>
          </span>
        </li>
      ))}
    </ol>
  );
}

const BUCKET: Record<string, { says: string; unit: string }> = {
  "show-opener": { says: "opens the show", unit: "shows" },
  "set2-opener": { says: "opens set 2", unit: "shows" },
  encore: { says: "closes it", unit: "encores" },
};

/** Set stats: three ranked ledgers side by side. */
export function SetLedgers({ buckets }: { buckets: { key: string; label: string; rows: { slug: string; name: string; count: number }[] }[] }) {
  if (buckets.length === 0) return <Nil>No sets logged yet</Nil>;
  return (
    <div className="grid gap-x-8 gap-y-6 lg:grid-cols-3">
      {buckets.map((b) => {
        const say = BUCKET[b.key] ?? { says: b.label.toLowerCase(), unit: "shows" };
        const top = b.rows[0]?.count ?? 1;
        return (
          <section key={b.key} className="min-w-0">
            <h2 className="mb-1 text-[0.9rem] font-extrabold text-muted">
              {say.says} <span className="font-bold text-faint">· {say.unit}</span>
            </h2>
            {b.rows.length === 0 ? (
              <p className="border-t border-line py-2 text-[0.85rem] text-muted">—</p>
            ) : (
              <ol>
                {b.rows.map((r, i) => (
                  <li key={r.slug} className="grid grid-cols-[1.4rem_minmax(0,1fr)_minmax(0,5rem)_2rem] items-center gap-2.5 border-t border-line py-1.5 text-[0.85rem]">
                    <span className="text-right text-[0.72rem] tabular-nums text-faint">{i + 1}</span>
                    <Link href={songHref(r)} className="truncate font-extrabold text-ink underline-offset-4 hover:underline">
                      {r.name}
                    </Link>
                    <Level value={r.count} top={top} />
                    <span className="text-right font-extrabold tabular-nums text-ink">{r.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        );
      })}
    </div>
  );
}

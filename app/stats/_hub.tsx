import Link from "next/link";
import type { SongIndexRow } from "@/lib/queries/songs";
import { compact, formatShortDate, songHref } from "@/lib/queries/format";
import { PlainTag } from "@/app/_components/yeti";
import { chromeLink } from "@/app/_components/page-chrome";
import { clsx } from "@/app/_components/clsx";
import type { CutMeta } from "./cuts";
import { catalogSplit, sharePct, type CatalogSplit } from "./hub";

/* 3.0's stats hub, as Yeti's Home for the catalog (spec 2026-11-18, round 6):
 * an answer instead of a chart, then each cut as a shelf of its first entries,
 * drawn the way the app draws that kind of thing. Server components. */

const lowDate = (iso: string) => formatShortDate(iso).toLowerCase();
const plural = (n: number, one: string, many = `${one}s`) => `${compact(n)} ${n === 1 ? one : many}`;
const sentence = (title: string) => title.charAt(0) + title.slice(1).toLowerCase();

// ── The answer: two aligned capsules, songs and plays ─────────────────────────

/** Below this share a segment is too thin to hold its label; it keeps its true
 * width and the label sits just outside the capsule. */
const SLIVER_PCT = 7;
const SEG = ["bg-[var(--snow)] text-[var(--night)]", "bg-[var(--segment-thumb)] text-ink", "bg-[var(--shelf)] text-muted"];

function Capsule({ label, parts, total }: { label: string; parts: { value: number; text: string }[]; total: number }) {
  const sliver = parts.find((p) => p.value > 0 && (p.value / total) * 100 < SLIVER_PCT);
  return (
    <div className="mt-2 grid grid-cols-[3.4rem_minmax(0,1fr)_2.4rem] items-center gap-2.5">
      <span className="text-[0.85rem] font-extrabold text-muted">{label}</span>
      <div className="flex gap-[3px] rounded-[12px] bg-[var(--night)] p-[3px] shadow-[inset_0_0_0_1px_var(--frost)]" aria-hidden="true">
        {parts.map((p, i) =>
          p.value > 0 ? (
            <span
              key={i}
              data-seg={i}
              className={clsx("grid h-[30px] min-w-[4px] place-items-center overflow-hidden rounded-[9px]", SEG[i])}
              style={{ flex: `${((p.value / total) * 100).toFixed(2)} 0 0` }}
            >
              {p !== sliver && <b className="whitespace-nowrap text-[0.75rem] font-extrabold">{p.text}</b>}
            </span>
          ) : null,
        )}
      </div>
      <span className="text-[0.75rem] font-extrabold text-muted" aria-hidden="true">
        {sliver?.text}
      </span>
    </div>
  );
}

export function CatalogAnswer({ plays, tailMax }: { plays: number[]; tailMax: number }) {
  const s: CatalogSplit | null = catalogSplit(plays, tailMax);
  if (!s) return null;
  const headShare = sharePct(s.head.plays, s.plays);
  const playText = (v: number, i: number) => (i === 0 && headShare === 50 ? "half" : `${sharePct(v, s.plays)}%`);
  const groups = [s.head, s.rest, s.tail];
  return (
    <section className="catalog-answer mt-6 rounded-[22px] bg-[var(--card-stock)] p-5 shadow-[inset_0_0_0_1px_var(--frost)]">
      <p className="mb-3.5 text-[1.15rem] text-muted">
        <b className="font-black text-ink">{plural(s.head.songs, "song")}</b>{" "}
        {s.head.songs === 1 ? "is" : "are"} half of everything the band has played.
      </p>
      <Capsule label="songs" total={s.songs} parts={groups.map((g) => ({ value: g.songs, text: compact(g.songs) }))} />
      <Capsule label="plays" total={s.plays} parts={groups.map((g, i) => ({ value: g.plays, text: playText(g.plays, i) }))} />
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.8rem] text-muted">
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-[var(--snow)] align-[-1px]" aria-hidden="true" />
          the staples, the top {compact(s.head.songs)}: {headShare}% of the plays
        </span>
        {s.rest.songs > 0 && (
          <span>
            <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-[var(--segment-thumb)] align-[-1px] shadow-[inset_0_0_0_1px_var(--frost)]" aria-hidden="true" />
            the rest of the rotation, {plural(s.rest.songs, "song")}: {sharePct(s.rest.plays, s.plays)}%
          </span>
        )}
        {s.tail.songs > 0 && (
          <span>
            <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-[var(--shelf)] align-[-1px] shadow-[inset_0_0_0_1px_var(--frost)]" aria-hidden="true" />
            played {tailMax} times or fewer, {plural(s.tail.songs, "song")}: {sharePct(s.tail.plays, s.plays)}% of the plays
          </span>
        )}
      </p>
    </section>
  );
}

// ── A shelf per cut ───────────────────────────────────────────────────────────

export function Shelf({
  cut,
  linkLabel,
  note,
  children,
}: {
  cut: CutMeta;
  linkLabel: string;
  note?: string | null;
  children: React.ReactNode;
}) {
  const href = `/stats/${cut.slug}`;
  return (
    <section className="hub-shelf min-w-0">
      <div className="flex items-baseline justify-between gap-2.5">
        <h2 className="text-[1.3rem] font-black tracking-[-0.005em] text-ink">
          <Link href={href} className="underline-offset-4 hover:underline">
            {sentence(cut.title)}
          </Link>
        </h2>
        <Link href={href} className={`shrink-0 whitespace-nowrap text-[0.82rem] ${chromeLink}`}>
          {linkLabel}
        </Link>
      </div>
      <p className="mb-3 mt-1 text-[0.82rem] text-muted">
        {cut.blurb}
        {note ? ` ${note}` : ""}
      </p>
      {children}
    </section>
  );
}

export function Nil({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.85rem] text-muted">{children} —</p>;
}

/** Most overdue: the Shelf's ring tiles. Foil is elapsed time; a full ring is
 * every show with a setlist. */
function OverdueRing({ gap, record }: { gap: number; record: number }) {
  const f = Math.min(record > 0 ? gap / record : 0, 0.995);
  const end = Math.max(f, 0.012);
  const r = 38;
  const a = ((end * 360 - 90) * Math.PI) / 180;
  return (
    <svg viewBox="0 0 100 100" className="block h-[86%] w-[86%]" aria-hidden="true">
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--frost)" strokeWidth={5} />
      <path
        d={`M50 12 A${r} ${r} 0 ${end > 0.5 ? 1 : 0} 1 ${(50 + r * Math.cos(a)).toFixed(2)} ${(50 + r * Math.sin(a)).toFixed(2)}`}
        fill="none"
        stroke="var(--foil)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <text x={50} y={52} textAnchor="middle" fontSize={21} fontWeight={900} fill="var(--ink)" style={{ fontVariantNumeric: "tabular-nums" }}>
        {compact(gap)}
      </text>
      <text x={50} y={65} textAnchor="middle" fontSize={8.5} fontWeight={700} fill="var(--muted)">
        shows since
      </text>
    </svg>
  );
}

export function OverdueTiles({ rows, record }: { rows: SongIndexRow[]; record: number }) {
  if (rows.length === 0) return <Nil>Nothing overdue</Nil>;
  return (
    <ol className="grid grid-cols-3 gap-3">
      {rows.map((r) => (
        <li key={r.songId} className="min-w-0">
          <Link href={songHref(r)} className="group grid min-w-0 justify-items-start gap-1">
            <span className="grid aspect-square w-full place-items-center rounded-[14px] bg-[var(--card-stock)] shadow-[inset_0_0_0_1px_var(--frost)]">
              <OverdueRing gap={r.currentGap ?? 0} record={record} />
            </span>
            <b className="max-w-full truncate text-[0.85rem] font-extrabold text-ink underline-offset-4 group-hover:underline">{r.name}</b>
            {!r.isOriginal && <PlainTag>cover</PlainTag>}
          </Link>
        </li>
      ))}
    </ol>
  );
}

/** Most played: a ledger with level tracks. */
export function PlaysLedger({ rows }: { rows: SongIndexRow[] }) {
  if (rows.length === 0) return <Nil>No plays logged yet</Nil>;
  const most = Math.max(1, rows[0].timesPlayed);
  return (
    <ol className="grid gap-[9px]">
      {rows.map((r) => (
        <li key={r.songId} className="grid grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_2.6rem] items-center gap-2.5 text-[0.88rem]">
          <Link href={songHref(r)} className="truncate font-extrabold text-ink underline-offset-4 hover:underline">
            {r.name}
          </Link>
          <span className="relative block h-1.5 rounded-full bg-[var(--frost)]" aria-hidden="true">
            <span className="absolute inset-y-0 left-0 rounded-full bg-steel" style={{ width: `${(r.timesPlayed / most) * 100}%` }} />
          </span>
          <span className="text-right font-extrabold tabular-nums text-ink">{compact(r.timesPlayed)}</span>
        </li>
      ))}
    </ol>
  );
}

/** Rarities: the count that is the cut, its split, and the rarities most
 * recently back (a song with more than one play, by its last date). */
export function RarityRows({ rows, lines }: { rows: SongIndexRow[]; lines: number }) {
  if (rows.length === 0) return <Nil>No rarities yet</Nil>;
  const originals = rows.filter((r) => r.isOriginal).length;
  const covers = rows.length - originals;
  const returns = rows
    .filter((r): r is SongIndexRow & { lastPlayedDate: string } => r.timesPlayed > 1 && r.lastPlayedDate != null)
    .sort((a, b) => (a.lastPlayedDate === b.lastPlayedDate ? a.name.localeCompare(b.name) : a.lastPlayedDate < b.lastPlayedDate ? 1 : -1))
    .slice(0, lines);
  return (
    <>
      <p className="mb-2 text-[0.9rem] text-muted">
        <b className="font-extrabold text-ink">{plural(rows.length, "song")}</b> {rows.length === 1 ? "qualifies" : "qualify"} ·{" "}
        {plural(originals, "original")}, {plural(covers, "cover")}
      </p>
      {returns.length > 0 && (
        <>
          <h3 className="mb-1 text-[0.85rem] font-extrabold text-muted">Most recently back</h3>
          <ol>
            {returns.map((r) => (
              <li key={r.songId} className="flex items-center justify-between gap-2.5 border-t border-line py-2 text-[0.88rem]">
                <span className="min-w-0 truncate">
                  <Link href={songHref(r)} className="font-extrabold text-ink underline-offset-4 hover:underline">
                    {r.name}
                  </Link>
                  {!r.isOriginal && <PlainTag className="ml-1.5">cover</PlainTag>}
                </span>
                <span className="shrink-0 text-[0.8rem] text-muted">
                  {r.timesPlayed}× · last {lowDate(r.lastPlayedDate)}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

/** Debuts: the newest, as rows. (The year columns above them are the page's.) */
export function DebutRows({ rows }: { rows: { slug: string; name: string; date: string; venue: string | null }[] }) {
  if (rows.length === 0) return <Nil>No debuts logged yet</Nil>;
  return (
    <ol className="mt-2.5">
      {rows.map((d) => (
        <li key={d.slug} className="grid grid-cols-[3.6rem_minmax(0,1fr)] items-center gap-2.5 border-t border-line py-2">
          <span className="text-[0.88rem] font-extrabold text-ink">{lowDate(d.date).replace(/, \d{4}$/, "")}</span>
          <span className="grid min-w-0">
            <Link href={songHref(d)} className="truncate text-[0.9rem] font-extrabold text-ink underline-offset-4 hover:underline">
              {d.name}
            </Link>
            {d.venue && <span className="truncate text-[0.8rem] text-muted">{d.venue}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

const LEADER_LINE: Record<string, { says: string; unit: [string, string] }> = {
  "show-opener": { says: "opens the show", unit: ["show", "shows"] },
  "set2-opener": { says: "opens set 2", unit: ["show", "shows"] },
  encore: { says: "closes it", unit: ["encore", "encores"] },
};

/** Set stats: each bucket's leader, said as a line in a list. */
export function SetLines({ buckets }: { buckets: { key: string; label: string; rows: { slug: string; name: string; count: number }[] }[] }) {
  if (buckets.length === 0) return <Nil>No sets logged yet</Nil>;
  return (
    <dl className="m-0">
      {buckets.map((b) => {
        const lead = b.rows[0];
        const line = LEADER_LINE[b.key] ?? { says: b.label.toLowerCase(), unit: ["show", "shows"] as [string, string] };
        return (
          <div key={b.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-2.5 border-t border-line py-2 text-[0.9rem]">
            <dt className="font-extrabold text-muted">{line.says}</dt>
            <dd className="m-0 flex min-w-0 justify-between gap-2.5">
              {lead ? (
                <>
                  <Link href={songHref(lead)} className="truncate font-extrabold text-ink underline-offset-4 hover:underline">
                    {lead.name}
                  </Link>
                  <span className="shrink-0 text-[0.82rem] text-muted">
                    {plural(lead.count, line.unit[0], line.unit[1])}
                  </span>
                </>
              ) : (
                <span className="text-muted">—</span>
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

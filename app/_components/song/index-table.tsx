import Link from "next/link";
import { songHref } from "@/lib/queries/format";
import type { SongIndexRow, SongSort } from "@/lib/queries/songs";
import { ScrollTable } from "./scroll-table";
import { MiniSparkline } from "./charts";

/** Wire the headers to the catalog's sort URLs: `active` gets the caret + aria-sort. */
export type SortLinks = { active?: SongSort; hrefFor: (key: SongSort) => string };

function SortableTh({ label, sortKey, dir, altKey, altDir, className, title, sort }: {
  label: string; sortKey: SongSort; dir: "ascending" | "descending";
  /** Reverse-direction twin (Played ▾ ↔ Rarest ▴): clicking the active header flips it. */
  altKey?: SongSort; altDir?: "ascending" | "descending";
  className?: string; title?: string; sort?: SortLinks;
}) {
  const active = !!sort && (sort.active === sortKey || (!!altKey && sort.active === altKey));
  const activeDir = altKey && sort?.active === altKey ? altDir! : dir;
  const linkKey = altKey && sort?.active === sortKey ? altKey : sortKey;
  return (
    <th className={className} title={title} aria-sort={active ? activeDir : undefined}>
      {sort ? (
        <Link href={sort.hrefFor(linkKey)} className={active ? "underline underline-offset-2" : "hover:underline"}>
          {label}
          {active && <span aria-hidden>{activeDir === "ascending" ? " ▴" : " ▾"}</span>}
        </Link>
      ) : label}
    </th>
  );
}

/** `rankOffset` keeps the # column honest across pages: page 2 of 100 starts at 101. */
export function SongIndexTable({ rows, years, sort, rankOffset = 0 }: { rows: SongIndexRow[]; years: number[]; sort?: SortLinks; rankOffset?: number }) {
  const span = years.length ? `${String(years[0]).slice(2)}–${String(years[years.length - 1]).slice(2)}` : "";
  return (
    <ScrollTable swipeHint="Song pinned · swipe → for more stats">
      <table className="song-table">
        <thead>
          <tr>
            <th className="num">#</th>
            <SortableTh label="Song" sortKey="az" dir="ascending" className="song-pin" sort={sort} />
            <SortableTh label="Played" sortKey="played" dir="descending" altKey="rare" altDir="ascending" className="num" sort={sort} />
            <th>Activity {span}</th>
            <SortableTh label="Rotation" sortKey="rotation" dir="descending" className="num" title="Rotation = share of shows since debut" sort={sort} />
            <SortableTh label="Gap" sortKey="overdue" dir="descending" className="num" title="Gap = shows since last played" sort={sort} />
            <SortableTh label="Last" sortKey="recent" dir="descending" sort={sort} />
            <SortableTh label="Debut" sortKey="debut" dir="descending" sort={sort} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.songId}>
              <td className="num dim">{rankOffset + i + 1}</td>
              <td className="song-pin" title={r.name}>
                <span className="song-pin-name">
                  <Link href={songHref(r)}>{r.name}</Link>
                  {!r.isOriginal && <span className="song-cover">cover</span>}
                </span>
                <span className="song-pin-stat">{r.timesPlayed} played</span>
              </td>
              <td className="num">{r.timesPlayed}</td>
              <td><MiniSparkline values={r.playsPerYear} /></td>
              <td className="num gold">{r.rotationPct}%</td>
              <td className={`num ${r.currentGap != null && r.currentGap >= 15 ? "overdue" : "gapcell"}`}>{r.currentGap ?? "—"}</td>
              <td className="dim">{r.lastPlayedDate ?? "—"}</td>
              <td className="dim">{r.debutYear ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}

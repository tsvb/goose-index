import { Fragment } from "react";
import Link from "next/link";
import { songHref } from "@/lib/queries/format";
import type { SongIndexRow, SongSort } from "@/lib/queries/songs";
import { ScrollTable } from "./scroll-table";
import { MiniSparkline } from "./charts";
import { bandcampHref } from "@/lib/bandcamp";

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

/** The heading a row sits under when the catalog is sorted by album. Songs with
 * no studio release gather under one bucket — about half of Goose's originals
 * have never been released, and that's a fact worth showing rather than a blank
 * cell to skim past. */
export const UNRELEASED = "Unreleased";

export function albumHeading(row: SongIndexRow): string {
  if (!row.album) return UNRELEASED;
  const year = row.album.releaseDate?.slice(0, 4);
  return year ? `${row.album.title} · ${year}` : row.album.title;
}

/** `rankOffset` keeps the # column honest across pages: page 2 of 100 starts at 101. */
export function SongIndexTable({ rows, years, sort, rankOffset = 0, groupByAlbum = false }: {
  rows: SongIndexRow[]; years: number[]; sort?: SortLinks; rankOffset?: number;
  /** Break the body into album sections. Only meaningful when the rows arrive in
   * album order — the query is what guarantees that, not this flag. */
  groupByAlbum?: boolean;
}) {
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
          {rows.map((r, i) => {
            // A section opens whenever the album changes. Rows arrive in album
            // order from the query, so a plain comparison with the previous row
            // is enough — no grouping pass, and pagination can split an album
            // across pages without the heading going missing.
            const heading = groupByAlbum ? albumHeading(r) : null;
            const opensSection = groupByAlbum && (i === 0 || heading !== albumHeading(rows[i - 1]));
            return (
          <Fragment key={r.songId}>
            {opensSection && (
              <tr className="song-group">
                <td colSpan={8}>
                  {heading === UNRELEASED ? (
                    <>
                      <span className="song-group-title">{UNRELEASED}</span>
                      <span className="song-group-note">no studio release</span>
                    </>
                  ) : bandcampHref(r.album?.url) ? (
                    <a
                      href={bandcampHref(r.album?.url)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="song-group-title song-group-link"
                      title={`Buy ${r.album!.title} from the band on Bandcamp`}
                    >
                      {heading} <span className="song-group-buy">Bandcamp ↗</span>
                    </a>
                  ) : (
                    <span className="song-group-title">{heading}</span>
                  )}
                </td>
              </tr>
            )}
            <tr>
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
          </Fragment>
            );
          })}
        </tbody>
      </table>
    </ScrollTable>
  );
}

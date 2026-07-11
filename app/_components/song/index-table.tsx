import Link from "next/link";
import { songHref } from "@/lib/queries/format";
import type { SongIndexRow } from "@/lib/queries/songs";
import { ScrollTable } from "./scroll-table";
import { MiniSparkline } from "./charts";

export function SongIndexTable({ rows, years }: { rows: SongIndexRow[]; years: number[] }) {
  const span = years.length ? `${String(years[0]).slice(2)}–${String(years[years.length - 1]).slice(2)}` : "";
  return (
    <ScrollTable swipeHint="Song pinned · swipe → for more stats">
      <table className="song-table">
        <thead>
          <tr>
            <th className="num">#</th><th className="song-pin">Song</th><th className="num">Played</th>
            <th>Activity {span}</th><th className="num">Rotation</th><th className="num">Gap</th><th>Last</th><th>Debut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.songId}>
              <td className="num dim">{i + 1}</td>
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

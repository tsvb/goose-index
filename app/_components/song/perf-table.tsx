import Link from "next/link";
import { showHref, RETURN_LABEL } from "@/lib/queries/format";
import type { SongPerf } from "@/lib/queries/songs";
import { ScrollTable } from "./scroll-table";

export function PerformanceTable({ perfs }: { perfs: SongPerf[] }) {
  return (
    <ScrollTable swipeHint="Date pinned · swipe → for venue, set, gap, time">
      <table className="song-table">
        <thead>
          <tr><th className="song-pin">Date</th><th>Venue</th><th>City</th><th>Set</th><th className="num">Gap</th><th className="num">Time</th><th>Notes</th></tr>
        </thead>
        <tbody>
          {perfs.map((p) => (
            <tr key={p.uniqueId}>
              <td className="song-pin"><Link href={showHref(p.date, p.order)}>{p.date}</Link></td>
              <td>{p.venue ?? "—"}</td>
              <td className="dim">{p.city ?? ""}</td>
              <td>{p.setLabel}</td>
              <td className="num gapcell">{p.gap ?? "—"}</td>
              <td className="num">{p.trackTime ?? "—"}</td>
              <td>
                {p.isDustedOff && <span className="song-bust">{RETURN_LABEL} · {p.gap ?? 0}</span>}
                {p.isJamchart && <span className="song-jam">★ JAM</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollTable>
  );
}

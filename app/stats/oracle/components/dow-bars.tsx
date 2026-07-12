import { WEEKDAYS } from "@/lib/queries/format";
import type { DayOfWeekJamsRow } from "@/lib/queries/discoveries";

/** Vertical bar chart of avg jams per show by day of week. Same house SVG-bar
 * style as PlaysPerYearChart; role="group" keeps the labels in the a11y tree. */
export function DayOfWeekBars({ data }: { data: DayOfWeekJamsRow[] }) {
  const ordered = orderMonSun(data);
  const max = Math.max(0.0001, ...ordered.map((d) => d.avgJams));
  const top = ordered.reduce((a, b) => (b.avgJams > a.avgJams ? b : a), ordered[0]);
  return (
    <div className="song-ppy" role="group" aria-label="Average jams per show by day of the week">
      {ordered.map((d) => {
        const isTop = top && d.dow === top.dow && d.avgJams > 0;
        return (
          <div className="song-ppy-col" key={d.dow}>
            <div
              className="song-ppy-bar"
              style={{ height: `${Math.max(3, Math.round((d.avgJams / max) * 100))}%`, opacity: isTop ? 1 : 0.85 }}
              title={`${d.dayName}: ${d.avgJams.toFixed(2)} avg jams across ${d.totalShows} show${d.totalShows === 1 ? "" : "s"}`}
            />
            <div className="song-ppy-ct">{d.avgJams.toFixed(2)}</div>
            <div className="song-ppy-yr">{d.dayName.slice(0, 3)}</div>
          </div>
        );
      })}
    </div>
  );
}

/** Shift Sunday (0) to the end so the row reads Mon → Sun. Missing days
 * get zero-filled so the chart's grid is always 7 columns wide. */
function orderMonSun(data: DayOfWeekJamsRow[]): DayOfWeekJamsRow[] {
  const by = new Map(data.map((d) => [d.dow, d]));
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order.map((dow) => by.get(dow) ?? { dow, dayName: WEEKDAYS[dow], totalShows: 0, avgJams: 0 });
}

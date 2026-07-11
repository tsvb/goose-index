import { groupSets, isSegue } from "./shared";
import { Footnotes, DocSection } from "../doc";
import type { SetlistEntry } from "@/lib/queries/shows";
import { RETURN_LABEL } from "@/lib/queries/format";
import { NugsLink } from "../nugs-link";
import { nugsTrackHref, nugsWebFallback } from "@/lib/nugs";

export function SetlistMinimal({ entries, showDate, venue }: { entries: SetlistEntry[]; showDate: string; venue: string | null }) {
  if (entries.length === 0) {
    return <p>No setlist has been recorded for this show yet.</p>;
  }
  const groups = groupSets(entries);
  const notes: { id: string; text: string }[] = [];
  entries.forEach((e) => {
    if (e.footnote) notes.push({ id: `fn-${e.uniqueId}`, text: `${e.song} — ${e.footnote}` });
    if (e.isJamchart && e.jamchartNotes) notes.push({ id: `n-${e.uniqueId}`, text: `${e.song} — ${e.jamchartNotes}` });
  });
  const noteIndex = new Map(notes.map((n, i) => [n.id, i + 1]));

  return (
    <div>
      {groups.map((g) => (
        <DocSection key={g.key} title={g.label}>
          <table className="doc-table">
            <tbody>
              {g.entries.map((e, i) => {
                const refIds = [`fn-${e.uniqueId}`, `n-${e.uniqueId}`].filter((id) => noteIndex.has(id));
                return (
                  <tr key={e.uniqueId} className="nugs-row">
                    <td className="num" style={{ width: "1.6rem" }}>{i + 1}</td>
                    <td>
                      {e.slug ? <a href={`/songs/${e.slug}`}>{e.song}</a> : e.song}
                      {refIds.map((id, j) => (
                        <sup key={id}>{j > 0 ? "," : ""}<a href={`#${id}`}>{noteIndex.get(id)}</a></sup>
                      ))}
                      {isSegue(e.transition) ? " >" : ""}
                      {e.isDustedOff ? <span className="doc-crumb"> [{RETURN_LABEL} · {e.gap}]</span> : null}
                    </td>
                    <td className="num">{e.trackTime ?? ""}</td>
                    <td className="num">
                      <NugsLink
                        href={nugsTrackHref({ date: showDate, venue, song: e.song, set: e.setNumber, pos: e.position })}
                        fallback={nugsWebFallback({ date: showDate, venue })}
                        className="nugs-track"
                      >listen</NugsLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </DocSection>
      ))}
      {notes.length > 0 && (
        <DocSection title="Notes">
          <Footnotes notes={notes} />
        </DocSection>
      )}
    </div>
  );
}

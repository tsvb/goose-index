import type { SetlistEntry } from "@/lib/queries/shows";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

// elgoose convention: set_type is "Set" or "One Set"; set_number is "1".."n"
// for sets and "e" / "e2" for encores.
export function setLabel(type: string | null, num: string | null): string {
  const n = (num ?? "").trim().toLowerCase();
  if (type === "Soundcheck") return "Soundcheck";
  if (type === "One Set") return "Set";
  if (n.startsWith("e")) {
    const idx = parseInt(n.slice(1), 10);
    return Number.isFinite(idx) && idx > 1 ? `Encore ${ROMAN[idx] ?? idx}` : "Encore";
  }
  const setNo = parseInt(n, 10);
  if (Number.isFinite(setNo)) return `Set ${ROMAN[setNo] ?? setNo}`;
  return type ?? "Set";
}

/**
 * Whether a footnote says nothing the row doesn't already say.
 *
 * elgoose footnotes a cover with its artist ("The Band."), and the 3.0 setlist
 * prints that artist beside the song. Repeating it as a numbered note under the
 * set gives the reader a superscript to chase for no new information — on a
 * night with three covers, half the notes block is the row said twice.
 */
export function footnoteRepeatsArtist(e: Pick<SetlistEntry, "footnote" | "isOriginal" | "originalArtist">): boolean {
  if (!e.footnote || e.isOriginal || !e.originalArtist) return false;
  const norm = (s: string) => s.trim().replace(/\.$/, "").trim().toLowerCase();
  return norm(e.footnote) === norm(e.originalArtist);
}

export const isSegue = (t: string | null): boolean => !!t && t.includes(">");

export type SetGroup = { key: string; label: string; entries: SetlistEntry[] };

export function groupSets(entries: SetlistEntry[]): SetGroup[] {
  const groups: SetGroup[] = [];
  for (const e of entries) {
    const key = `${e.setType}|${e.setNumber}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.entries.push(e);
    else groups.push({ key, label: setLabel(e.setType, e.setNumber), entries: [e] });
  }
  return groups;
}

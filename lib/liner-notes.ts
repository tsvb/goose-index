/** The band's Bandcamp liner notes, read into lines the 3.0 coach's card can lay
 * out. Layout only: every word of the source survives, in order, and nothing is
 * inferred. The notes arrive as plain text in one shape —
 *
 *   2026/06/28 Merriweather Post Pavilion, Columbia, MD
 *
 *   Set 1: Bear [1] -> Butter Rum, …
 *   Encore: Dripfield
 *
 *   Coach's Notes:
 *    [1] The Shouting Matches.
 *
 *   Show Notes: This show was one set due to a weather delay.
 *
 * — and a line that doesn't match a shape is kept as plain text, so a release
 * written differently still prints whole. */
export type LinerLine =
  /** The opening "YYYY/MM/DD place" line, date stripped: the card prints the date itself. */
  | { kind: "place"; text: string }
  /** "Set 1: …", "Encore: …", "Show Notes: …" */
  | { kind: "row"; label: string; value: string }
  /** A bare "Coach's Notes:" heading. */
  | { kind: "head"; text: string }
  /** " [1] The Shouting Matches." */
  | { kind: "note"; mark: string; text: string }
  | { kind: "text"; text: string };

const PLACE = /^\d{4}\/\d{2}\/\d{2}\s+(.+)$/;
const NOTE = /^\[([^\]\s]{1,4})\]\s*(.*)$/;
const HEAD = /^([A-Za-z][^:]{0,30}):$/;
/** A short label that starts with a letter, then ": " and a value. Long or
 * sentence-like prefixes ("He said: …") stay text: 24 characters, no digits
 * first, no sentence punctuation. */
const ROW = /^([A-Za-z][A-Za-z0-9'’ &-]{0,23}):\s+(.+)$/;

export function linerLines(notes: string): LinerLine[] {
  const out: LinerLine[] = [];
  for (const raw of notes.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let m: RegExpMatchArray | null;
    if (out.length === 0 && (m = line.match(PLACE))) out.push({ kind: "place", text: m[1] });
    else if ((m = line.match(NOTE))) out.push({ kind: "note", mark: m[1], text: m[2] });
    else if ((m = line.match(HEAD))) out.push({ kind: "head", text: m[1] });
    else if ((m = line.match(ROW))) out.push({ kind: "row", label: m[1], value: m[2] });
    else out.push({ kind: "text", text: line });
  }
  return out;
}

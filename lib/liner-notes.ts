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

// ── The card (3.0, round 4): each note printed where its mark is ─────────────

/** A song in a set line, the coach's short notes on it, and how it runs into
 * the next song: the band's own `,`, `>` or `->` (`→` reads as `->`). */
export type SetPiece = { song: string; tags: string[]; join: "," | ">" | "->" | null };
export type LinerSet = {
  label: string;
  /** Soundcheck: the quietest line on the card. */
  quiet: boolean;
  pieces: SetPiece[];
  /** Notes too long for a tag, printed under the set with the song they're about. */
  asides: { song: string; note: string }[];
};
export type LinerBlock =
  | { kind: "set"; set: LinerSet }
  | { kind: "row"; label: string; value: string }
  | { kind: "text"; text: string };

const SET_LABEL = /^(one set|set\b.*|encore.*|soundcheck)$/i;
const SEPARATOR = /(\s*,\s*|\s+->\s+|\s+→\s+|\s+>\s+)/;
const MARKS = /\s*\[([^\]\s]{1,4})\]/g;

/** A note reads as a tag while it's a short phrase; a sentence goes under the set. */
export function isShortNote(note: string): boolean {
  const n = note.replace(/\.$/, "");
  return n.length <= 28 && !n.includes(". ");
}

function joinOf(sep: string): SetPiece["join"] {
  const s = sep.trim();
  return s === "," ? "," : s === ">" ? ">" : "->";
}

/** Reads a release's notes for 3.0's coach's card: each numbered note moves onto
 * the song its mark sits on. Every word survives — a note whose mark appears in
 * no set line, or a mark with no note, prints as written — and only the numbers
 * go. */
export function linerCard(notes: string): { place: string | null; blocks: LinerBlock[] } {
  const lines = linerLines(notes);
  const place = lines[0]?.kind === "place" ? lines[0].text : null;
  const body = place ? lines.slice(1) : lines;

  const byMark = new Map<string, string>();
  for (const l of body) if (l.kind === "note") byMark.set(l.mark, l.text);
  const used = new Set<string>();

  const blocks: LinerBlock[] = [];
  body.forEach((l, i) => {
    if (l.kind === "row" && SET_LABEL.test(l.label)) {
      const parts = l.value.split(SEPARATOR);
      const pieces: SetPiece[] = [];
      const asides: LinerSet["asides"] = [];
      for (let p = 0; p < parts.length; p += 2) {
        const raw = parts[p];
        const marks = [...raw.matchAll(MARKS)].map((m) => m[1]);
        const song = raw.replace(MARKS, "").trim();
        const tags: string[] = [];
        for (const mark of marks) {
          const note = byMark.get(mark);
          if (note == null) {
            tags.push(`[${mark}]`);
            continue;
          }
          used.add(mark);
          if (isShortNote(note)) tags.push(note.replace(/\.$/, ""));
          else asides.push({ song, note });
        }
        pieces.push({ song, tags, join: p + 1 < parts.length ? joinOf(parts[p + 1]) : null });
      }
      blocks.push({ kind: "set", set: { label: l.label, quiet: /^soundcheck$/i.test(l.label), pieces, asides } });
    } else if (l.kind === "row") {
      blocks.push({ kind: "row", label: l.label, value: l.value });
    } else if (l.kind === "head") {
      // "Coach's Notes:" heads the notes that now sit on their songs; it stays
      // only if something other than a note follows it.
      if (body[i + 1]?.kind !== "note") blocks.push({ kind: "text", text: `${l.text}:` });
    } else if (l.kind === "text" || l.kind === "place") {
      blocks.push({ kind: "text", text: l.text });
    }
  });
  // Notes no set line points at keep their number, so nothing the band wrote is lost.
  for (const l of body) if (l.kind === "note" && !used.has(l.mark)) blocks.push({ kind: "text", text: `[${l.mark}] ${l.text}` });
  return { place, blocks };
}

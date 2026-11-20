import { describe, it, expect } from "vitest";
import { linerLines, linerCard, isShortNote } from "./liner-notes";

// The shape of a real release's notes (2026-06-27, Red Hat Amphitheater).
const RELEASE = `2026/06/27 Red Hat Amphitheater, Raleigh, NC

One Set: SOS, Your Direction -> Bloodbuzz Ohio [1], Savenger

Encore: Shama Lama Ding Dong [2] -> The Empress Of Organos

Coach's Notes:
 [1] The National.
 [2] Otis Day & The Knights. Unfinished.

Show Notes: This show was one set due to a weather delay.`;

describe("linerLines", () => {
  it("reads a release into place, rows, a head and numbered notes", () => {
    expect(linerLines(RELEASE)).toEqual([
      { kind: "place", text: "Red Hat Amphitheater, Raleigh, NC" },
      { kind: "row", label: "One Set", value: "SOS, Your Direction -> Bloodbuzz Ohio [1], Savenger" },
      { kind: "row", label: "Encore", value: "Shama Lama Ding Dong [2] -> The Empress Of Organos" },
      { kind: "head", text: "Coach's Notes" },
      { kind: "note", mark: "1", text: "The National." },
      { kind: "note", mark: "2", text: "Otis Day & The Knights. Unfinished." },
      { kind: "row", label: "Show Notes", value: "This show was one set due to a weather delay." },
    ]);
  });

  it("drops only blank lines: every word of the source survives, in order", () => {
    const words = (s: string) => s.replace(/\d{4}\/\d{2}\/\d{2}/, "").replace(/[:[\]]/g, " ").split(/\s+/).filter(Boolean);
    const printed = linerLines(RELEASE)
      .map((l) =>
        l.kind === "row" ? `${l.label} ${l.value}` : l.kind === "note" ? `${l.mark} ${l.text}` : l.text,
      )
      .join(" ");
    expect(words(printed)).toEqual(words(RELEASE));
  });

  it("only treats a dated FIRST line as the place", () => {
    const lines = linerLines("Set 1: A\n2026/06/27 Not a header");
    expect(lines[1]).toEqual({ kind: "text", text: "2026/06/27 Not a header" });
  });

  it("keeps sentence-like lines whole as text, not as a label", () => {
    expect(linerLines("He said this, later: the jam was long")).toEqual([
      { kind: "text", text: "He said this, later: the jam was long" },
    ]);
    expect(linerLines("A free-standing remark.")).toEqual([{ kind: "text", text: "A free-standing remark." }]);
  });

  it("reads Windows line endings and an empty note", () => {
    expect(linerLines("Encore: X\r\n\r\nCoach's Notes:")).toEqual([
      { kind: "row", label: "Encore", value: "X" },
      { kind: "head", text: "Coach's Notes" },
    ]);
    expect(linerLines("")).toEqual([]);
  });
});

describe("linerCard (3.0, round 4)", () => {
  it("moves each note onto the song its mark sits on, and drops only the numbers", () => {
    const card = linerCard(RELEASE);
    expect(card.place).toBe("Red Hat Amphitheater, Raleigh, NC");
    const [oneSet, encore, showNotes] = card.blocks;
    expect(oneSet).toEqual({
      kind: "set",
      set: {
        label: "One Set",
        quiet: false,
        pieces: [
          { song: "SOS", tags: [], join: "," },
          { song: "Your Direction", tags: [], join: "->" },
          { song: "Bloodbuzz Ohio", tags: ["The National"], join: "," },
          { song: "Savenger", tags: [], join: null },
        ],
        asides: [],
      },
    });
    // A sentence, not a phrase: under the set, with its song.
    expect(encore).toMatchObject({
      kind: "set",
      set: { asides: [{ song: "Shama Lama Ding Dong", note: "Otis Day & The Knights. Unfinished." }] },
    });
    expect(showNotes).toEqual({ kind: "row", label: "Show Notes", value: "This show was one set due to a weather delay." });
    // The "Coach's Notes:" head goes with the numbers.
    expect(card.blocks).toHaveLength(3);
  });

  it("puts a note marked on several songs on each of them, and keeps // inside a title", () => {
    const card = linerCard("Set 1: Yeti [1] -> Good Times // End Times > Drive [1]\n\nCoach's Notes:\n [1] Unfinished.");
    const set = card.blocks[0];
    expect(set.kind === "set" && set.set.pieces).toEqual([
      { song: "Yeti", tags: ["Unfinished"], join: "->" },
      { song: "Good Times // End Times", tags: [], join: ">" },
      { song: "Drive", tags: ["Unfinished"], join: null },
    ]);
  });

  it("reads → as the band's ->, and marks soundcheck as the quiet line", () => {
    const card = linerCard("Set 1: Royal → Atlas\nSoundcheck: Not Alone");
    expect(card.blocks[0]).toMatchObject({ set: { pieces: [{ song: "Royal", join: "->" }, { song: "Atlas", join: null }] } });
    expect(card.blocks[1]).toMatchObject({ set: { label: "Soundcheck", quiet: true } });
  });

  it("loses nothing: a mark with no note keeps its number, a note nothing points at prints as written", () => {
    const card = linerCard("Set 1: Arcadia [3]\n\nCoach's Notes:\n [1] Unfinished.");
    expect(card.blocks[0]).toMatchObject({ set: { pieces: [{ song: "Arcadia", tags: ["[3]"] }] } });
    expect(card.blocks[1]).toEqual({ kind: "text", text: "[1] Unfinished." });
  });

  it("tells a short phrase from a sentence", () => {
    expect(isShortNote("Slow, melodic version.")).toBe(true);
    expect(isShortNote("Otis Day & The Knights. Unfinished.")).toBe(false);
    expect(isShortNote("A note that runs well past twenty-eight characters")).toBe(false);
  });
});

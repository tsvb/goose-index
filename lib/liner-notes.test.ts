import { describe, it, expect } from "vitest";
import { linerLines } from "./liner-notes";

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

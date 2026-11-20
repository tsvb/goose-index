import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SetTape } from "./tape";
import type { SetlistEntry } from "@/lib/queries/shows";

function entry(over: Partial<SetlistEntry> & { song: string }): SetlistEntry {
  return {
    uniqueId: over.song + (over.position ?? 1),
    songId: 1,
    slug: null,
    setType: "Set",
    setNumber: "1",
    position: 1,
    trackTime: "5:00",
    transition: null,
    isJamchart: false,
    jamchartNotes: null,
    isReprise: false,
    isOriginal: true,
    originalArtist: null,
    footnote: null,
    gap: null,
    isDustedOff: false,
    ...over,
  };
}

/** Each segment's flex-grow is its share of the set. */
function segments(html: string) {
  return [...html.matchAll(/flex-grow:([\d.]+)[^"]*"/g)].map((m) => Number(m[1]));
}

describe("SetTape", () => {
  it("makes each song as wide as it is long", () => {
    const html = renderToStaticMarkup(
      <SetTape
        entries={[
          entry({ song: "Short", trackTime: "2:00", position: 1 }),
          entry({ song: "Long", trackTime: "18:00", position: 2 }),
        ]}
      />,
    );
    const [short, long] = segments(html);
    // 18 minutes must be nine times the tape of 2 minutes, not merely "bigger".
    expect(long / short).toBeCloseTo(9, 1);
  });

  it("fuses a segued run into one piece, with a seam, not a gap", () => {
    const html = renderToStaticMarkup(
      <SetTape
        entries={[
          entry({ song: "A", transition: ">", position: 1 }),
          entry({ song: "B", position: 2 }),
        ]}
      />,
    );
    // The second segment butts against the first, squared off where they meet...
    expect(html).toContain("border-left:1px solid var(--bg-deep)");
    expect(html).toContain("rounded-r-none");
    expect(html).toContain("rounded-l-none");
    // ...and a run of songs must still be countable: without a seam, four
    // segued songs read as one slab and the strip stops being a setlist.
    const seams = html.match(/border-left:1px solid var\(--bg-deep\)/g) ?? [];
    expect(seams).toHaveLength(1);
  });

  it("breaks unsegued songs apart", () => {
    const html = renderToStaticMarkup(
      <SetTape entries={[entry({ song: "A", position: 1 }), entry({ song: "B", position: 2 })]} />,
    );
    expect(html).not.toContain("border-left:1px solid var(--bg-deep)");
    expect(html).toContain("ml-[3px]");
    expect(html).not.toContain("rounded-r-none");
  });

  it("marks the jams in the heat color", () => {
    const html = renderToStaticMarkup(
      <SetTape
        entries={[
          entry({ song: "Normal", position: 1 }),
          entry({ song: "Jam", isJamchart: true, position: 2 }),
        ]}
      />,
    );
    expect(html).toContain("bg-ember");
    expect(html).toContain("bg-steel");
  });

  it("draws a song with no logged time hollow rather than dropping it", () => {
    const html = renderToStaticMarkup(
      <SetTape
        entries={[
          entry({ song: "Timed", trackTime: "10:00", position: 1 }),
          entry({ song: "Timed2", trackTime: "10:00", position: 2 }),
          entry({ song: "Untimed", trackTime: null, position: 3 }),
        ]}
      />,
    );
    // Present, visibly not a real duration, and admitted in the caption.
    expect(segments(html)).toHaveLength(3);
    expect(html).toContain("bg-transparent shadow-[inset_0_0_0_1px_var(--frost)]");
    expect(html).toContain("no logged time, shown hollow");
  });

  it("says nothing when too little of the set is timed to be honest about shape", () => {
    const html = renderToStaticMarkup(
      <SetTape
        entries={[
          entry({ song: "A", trackTime: "5:00", position: 1 }),
          entry({ song: "B", trackTime: null, position: 2 }),
          entry({ song: "C", trackTime: null, position: 3 }),
          entry({ song: "D", trackTime: null, position: 4 }),
        ]}
      />,
    );
    expect(html).toBe("");
  });

  it("renders nothing rather than dividing by zero", () => {
    expect(renderToStaticMarkup(<SetTape entries={[]} />)).toBe("");
  });
});

describe("SetTape drawing", () => {
  it("is a length in a well, not tape: no minute ruler, only the two ends", () => {
    const html = renderToStaticMarkup(
      <SetTape entries={[entry({ song: "A", trackTime: "10:00" }), entry({ song: "B", trackTime: "12:00" })]} explain />,
    );
    expect(html).toContain("0:00");
    expect(html).toContain("22:00");
    expect(html).not.toContain("h-1 w-px");
    // The caption no longer speaks tape (the class hooks still say set-tape).
    expect(html).not.toMatch(/as tape|splice|burn/i);
  });
});

describe("SetTape caption", () => {
  const timed = [entry({ song: "A", trackTime: "10:00" }), entry({ song: "B", trackTime: "12:00" })];
  it("prints the reading key only when asked — the show page asks once", () => {
    expect(renderToStaticMarkup(<SetTape entries={timed} />)).not.toContain("as wide as it is long");
    expect(renderToStaticMarkup(<SetTape entries={timed} explain />)).toContain("Each song is as wide as it is long");
  });
  it("still notes this tape's unlogged times without the key", () => {
    const mixed = [...timed, entry({ song: "C", trackTime: null })];
    const html = renderToStaticMarkup(<SetTape entries={mixed} />);
    expect(html).toContain("1 song has no logged time");
    expect(html).not.toContain("as wide as it is long");
  });
});

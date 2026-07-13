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
    isJam: false,
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

  it("joins a segued run with a splice, not a gap", () => {
    const html = renderToStaticMarkup(
      <SetTape
        entries={[
          entry({ song: "A", transition: ">", position: 1 }),
          entry({ song: "B", position: 2 }),
        ]}
      />,
    );
    // The second segment butts against the first...
    expect(html).toContain("border-left:1px solid var(--bg-deep)");
    // ...and a run of songs must still be countable: without a seam, four
    // segued songs read as one slab and the tape stops being a setlist.
    const seams = html.match(/border-left:1px solid var\(--bg-deep\)/g) ?? [];
    expect(seams).toHaveLength(1);
  });

  it("breaks unsegued songs apart", () => {
    const html = renderToStaticMarkup(
      <SetTape entries={[entry({ song: "A", position: 1 }), entry({ song: "B", position: 2 })]} />,
    );
    expect(html).not.toContain("border-left:1px solid var(--bg-deep)");
    expect(html).toContain("ml-[3px]");
  });

  it("burns the jams", () => {
    const html = renderToStaticMarkup(
      <SetTape
        entries={[
          entry({ song: "Normal", position: 1 }),
          entry({ song: "Jam", isJamchart: true, position: 2 }),
        ]}
      />,
    );
    expect(html).toContain("bg-ember");
    expect(html).toContain("bg-gold");
  });

  it("hatches a song with no logged time rather than dropping it", () => {
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
    expect(html).toContain("repeating-linear-gradient");
    expect(html).toContain("no logged time");
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

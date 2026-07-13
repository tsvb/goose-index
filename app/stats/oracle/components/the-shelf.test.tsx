import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TheShelf, spoolReadings } from "./the-shelf";
import type { ShelfRow } from "@/lib/queries/discoveries";

function row(name: string, daysSincePlayed: number, totalPlays = 9, songId = daysSincePlayed): ShelfRow {
  return {
    songId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    lastPlayedDate: "2024-01-01",
    totalPlays,
    daysSincePlayed,
  };
}

/** Thickness comes off the pack (graphite — the song's size); the red-zone
 * reading comes off the ring, which is the only thing carrying accent. */
function marks(html: string) {
  const packs = [...html.matchAll(/data-role="pack"[^>]*stroke="var\(--line\)" stroke-width="([\d.]+)"/g)];
  const rings = [...html.matchAll(/data-role="gap"[^>]*stroke="var\(--(ember|gold)\)"/g)];
  return packs.map((m, i) => ({
    thickness: Number(m[1]),
    red: rings[i]?.[1] === "ember",
  }));
}

describe("TheShelf spools", () => {
  const data = [row("Longest", 1367), row("Middle", 400), row("Shortest", 88)];

  it("runs the ring into the red only past a year on the shelf", () => {
    const m = marks(renderToStaticMarkup(<TheShelf data={data} />));
    expect(m).toHaveLength(3);
    expect(m.map((x) => x.red)).toEqual([true, true, false]);
  });

  it("spends accent only on the ring — never on the tape", () => {
    const html = renderToStaticMarkup(<TheShelf data={data} />);
    // Colour means exactly one thing here: how long it has been. If the pack
    // ever takes accent again, a fat spool starts out-shouting an urgent one.
    const packsWithAccent = html.match(/data-role="pack"[^>]*var\(--(gold|ember)\)/g);
    expect(packsWithAccent).toBeNull();
  });

  it("draws one countdown ring per song", () => {
    const html = renderToStaticMarkup(<TheShelf data={data} />);
    expect([...html.matchAll(/data-role="gap"/g)]).toHaveLength(data.length);
  });

  it("still names every song and its gap in text, for screen readers", () => {
    const html = renderToStaticMarkup(<TheShelf data={data} />);
    for (const s of data) {
      expect(html).toContain(s.name);
      expect(html).toContain(String(s.daysSincePlayed));
    }
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders an empty state rather than dividing by zero", () => {
    expect(renderToStaticMarkup(<TheShelf data={[]} />)).toContain("No originals qualify yet");
  });
});

// The two channels must carry *different* facts. An earlier pass drew tape as
// `1 - gap` — the same number twice — which told you nothing the ring hadn't
// already said, and made a staple that vanished indistinguishable from a rarity
// that vanished. That distinction is the reason this section is worth drawing.
describe("spoolReadings", () => {
  it("reads the ring as time since the last play", () => {
    const [longest, middle, shortest] = spoolReadings([
      row("Longest", 1367),
      row("Middle", 400),
      row("Shortest", 88),
    ]);
    expect(longest.gap).toBeGreaterThan(middle.gap);
    expect(middle.gap).toBeGreaterThan(shortest.gap);
    expect(longest.gap).toBeCloseTo(1, 5);
  });

  it("reads the tape as how big a song is, independent of the gap", () => {
    // Same gap throughout: tape must still separate the staple from the rarity.
    const [rarity, mid, staple] = spoolReadings([
      row("Rarity", 500, 6),
      row("Mid", 500, 30),
      row("Staple", 500, 110),
    ]);
    expect(rarity.wound).toBeLessThan(mid.wound);
    expect(mid.wound).toBeLessThan(staple.wound);
    // Identical gaps must not be smeared apart by the play counts.
    expect(rarity.gap).toBe(staple.gap);
  });

  it("distinguishes a vanished staple from a vanished rarity", () => {
    const [rarity, staple] = spoolReadings([row("Rarity", 1300, 7), row("Staple", 1300, 110)]);
    // Both long gone — same ring...
    expect(rarity.gap).toBe(staple.gap);
    // ...but the staple is visibly the bigger song, which is the alarming case.
    expect(staple.wound).toBeGreaterThan(rarity.wound);
  });

  it("keeps a visible stub of ring for the most recently played song", () => {
    const readings = spoolReadings([row("Old", 1367), row("Fresh", 88)]);
    expect(readings[1].gap).toBeGreaterThan(0);
  });

  it("does not collapse when every gap or every play count is identical", () => {
    const sameGap = spoolReadings([row("A", 200, 10, 1), row("B", 200, 10, 2)]);
    expect(sameGap[0].gap).toBe(sameGap[1].gap);
    expect(sameGap[0].wound).toBe(sameGap[1].wound);
    expect(sameGap[0].gap).toBeGreaterThan(0);
    expect(sameGap[0].wound).toBeGreaterThan(0);
  });
});

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
 * reading comes off the ring, which is the only thing carrying accent. The
 * ring draws --foil past a year and --gap-near before it: one color in 3.0
 * (foil is elapsed time), 2.0's old steel/ember pair through the aliases. */
function marks(html: string) {
  const packs = [...html.matchAll(/data-role="pack"[^>]*stroke="var\(--graphite\)" stroke-width="([\d.]+)"/g)];
  const rings = [...html.matchAll(/data-role="gap"[^>]*stroke="var\(--(foil|gap-near)\)"/g)];
  return packs.map((m, i) => ({
    thickness: Number(m[1]),
    red: rings[i]?.[1] === "foil",
  }));
}

describe("TheShelf spools (2.0)", () => {
  const data = [row("Longest", 1367), row("Middle", 400), row("Shortest", 88)];

  it("runs the ring into the red only past a year on the shelf", () => {
    const m = marks(renderToStaticMarkup(<TheShelf data={data} edition="functional" />));
    expect(m).toHaveLength(3);
    expect(m.map((x) => x.red)).toEqual([true, true, false]);
  });

  it("spends accent only on the ring — never on the tape", () => {
    const html = renderToStaticMarkup(<TheShelf data={data} edition="functional" />);
    // Color means exactly one thing here: how long it has been. If the pack
    // ever takes accent again, a fat spool starts out-shouting an urgent one.
    const packsWithAccent = html.match(/data-role="pack"[^>]*var\(--(gold|steel|ember|hand|foil|gap-near)\)/g);
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

describe("TheShelf ring and disc (3.0)", () => {
  const data = [row("Longest", 1367, 9), row("Middle", 400, 40), row("Shortest", 88, 110)];
  const html = renderToStaticMarkup(<TheShelf data={data} edition="fancy" />);

  it("draws the pill's foil ring for every song, and no spool", () => {
    expect([...html.matchAll(/data-role="gap"[^>]*stroke="var\(--foil\)"/g)]).toHaveLength(3);
    expect(html).not.toContain('data-role="pack"');
    // The six-prong hub is the tape theme's; it doesn't come along.
    expect(html).not.toContain("var(--graphite)");
  });

  it("marks a year on the shelf with a halo, not a color change", () => {
    expect([...html.matchAll(/data-role="halo"/g)]).toHaveLength(2);
  });

  it("sizes the disc by plays and never spends accent on it", () => {
    const radii = [...html.matchAll(/data-role="disc"[^>]*r="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(radii).toHaveLength(3);
    expect(radii[0]).toBeLessThan(radii[1]);
    expect(radii[1]).toBeLessThan(radii[2]);
    expect(html.match(/data-role="disc"[^>]*var\(--(foil|sale|hand|ember|gap-near)\)/g)).toBeNull();
  });

  it("captions the disc, not the tape", () => {
    expect(html).toContain("A big disc inside a closed ring");
    expect(html).not.toMatch(/spool|tape|hub/i);
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

  it("names what the ring draws in each edition: 3.0's halo, 2.0's red", () => {
    const data = [row("Longest", 1367), row("Shortest", 88)];
    const fancy = renderToStaticMarkup(<TheShelf data={data} edition="fancy" />);
    expect(fancy).toContain("Past a year the ring gets a halo.");
    expect(fancy).not.toContain("runs into the");
    const glossy = renderToStaticMarkup(<TheShelf data={data} edition="functional" />);
    expect(glossy).toContain("Past a year the ring runs into the");
    expect(glossy).not.toContain("halo");
  });
});

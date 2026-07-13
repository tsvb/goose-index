import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TheShelf } from "./the-shelf";
import type { ShelfRow } from "@/lib/queries/discoveries";

function row(name: string, daysSincePlayed: number, songId = daysSincePlayed): ShelfRow {
  return {
    songId,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
    lastPlayedDate: "2024-01-01",
    totalPlays: 9,
    daysSincePlayed,
  };
}

/** Match the wound pack itself — not the ghost windings or the red-zone glow,
 * which carry the same accent stroke. */
function packs(html: string) {
  return [...html.matchAll(/data-role="pack"[^>]*stroke="var\(--(ember|gold)\)" stroke-width="([\d.]+)"/g)].map((m) => ({
    red: m[1] === "ember",
    thickness: Number(m[2]),
  }));
}

// The spool is not decoration: the tape left on it *is* the gap. If a refactor
// ever inverts or flattens that mapping, the section silently starts lying.
describe("TheShelf spools", () => {
  const data = [row("Longest", 1367), row("Middle", 400), row("Shortest", 88)];

  it("winds less tape the longer a song has been shelved", () => {
    const p = packs(renderToStaticMarkup(<TheShelf data={data} />));
    expect(p).toHaveLength(3);
    expect(p[0].thickness).toBeLessThan(p[1].thickness);
    expect(p[1].thickness).toBeLessThan(p[2].thickness);
  });

  it("runs into the red only past a year on the shelf", () => {
    const p = packs(renderToStaticMarkup(<TheShelf data={data} />));
    expect(p.map((x) => x.red)).toEqual([true, true, false]);
  });

  it("keeps a visible pack even for the barest spool", () => {
    const p = packs(renderToStaticMarkup(<TheShelf data={data} />));
    expect(p[0].thickness).toBeGreaterThan(0);
  });

  it("does not collapse when every gap is identical", () => {
    const flat = [row("A", 200, 1), row("B", 200, 2)];
    const p = packs(renderToStaticMarkup(<TheShelf data={flat} />));
    expect(p).toHaveLength(2);
    expect(p[0].thickness).toBe(p[1].thickness);
    expect(p[0].thickness).toBeGreaterThan(0);
  });

  it("still names every song and its gap in text, for screen readers", () => {
    const html = renderToStaticMarkup(<TheShelf data={data} />);
    for (const s of data) {
      expect(html).toContain(s.name);
      expect(html).toContain(String(s.daysSincePlayed));
    }
    // The SVG is decorative — the figures above carry the meaning.
    expect(html).toContain('aria-hidden="true"');
  });

  it("renders an empty state rather than dividing by zero", () => {
    expect(renderToStaticMarkup(<TheShelf data={[]} />)).toContain("No originals qualify yet");
  });
});

import { describe, it, expect } from "vitest";
import { debutNights } from "./_cuts";

describe("debutNights", () => {
  it("groups the songs that debuted on the same night, keeping the query's order", () => {
    const d = (name: string, date: string, venue: string | null) => ({ slug: name.toLowerCase(), name, date, venue });
    const nights = debutNights([
      d("Blade Runner", "2026-11-14", "Mohegan Sun Arena"),
      d("Bear", "2025-12-12", "Amica Mutual Pavilion"),
      d("Dramophone", "2025-12-12", "Amica Mutual Pavilion"),
      d("Peach", "2025-09-20", null),
    ]);
    expect(nights.map((n) => [n.date, n.songs.map((s) => s.name)])).toEqual([
      ["2026-11-14", ["Blade Runner"]],
      ["2025-12-12", ["Bear", "Dramophone"]],
      ["2025-09-20", ["Peach"]],
    ]);
  });

  it("keeps two shows on one date apart when the venues differ", () => {
    const nights = debutNights([
      { slug: "a", name: "A", date: "2025-01-01", venue: "X" },
      { slug: "b", name: "B", date: "2025-01-01", venue: "Y" },
    ]);
    expect(nights).toHaveLength(2);
  });
});

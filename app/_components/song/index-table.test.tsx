import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SongIndexTable } from "./index-table";
import type { SongIndexRow } from "@/lib/queries/songs";

const row: SongIndexRow = {
  songId: 1, name: "Hot Tea", slug: "hot-tea", isOriginal: true,
  timesPlayed: 187, rotationPct: 29, currentGap: 3, lastPlayedDate: "2026-06-12",
  debutYear: 2017, playsPerYear: [2, 5, 4, 1, 7, 9, 10, 8, 6, 5],
};
describe("SongIndexTable", () => {
  it("links the song and pins the identity column", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={[row]} years={[2017,2018,2019,2020,2021,2022,2023,2024,2025,2026]} />);
    expect(html).toContain('href="/songs/hot-tea"');
    expect(html).toContain("song-pin");      // sticky identity column
    expect(html).toContain("187");
  });
});

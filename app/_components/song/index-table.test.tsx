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

  it("exposes the full name and the played count inside the pinned cell", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={[row]} years={[2017,2018,2019,2020,2021,2022,2023,2024,2025,2026]} />);
    expect(html).toContain('title="Hot Tea"');                          // full name survives the mobile ellipsis cap
    expect(html).toContain('<span class="song-pin-stat">187 played');   // key stat rides along on small screens
  });

  it("continues the # rank across pages via rankOffset", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={[row]} years={[2017]} rankOffset={100} />);
    expect(html).toContain('<td class="num dim">101</td>'); // page 2 starts at 101, not 1
  });

  it("explains Gap and Rotation in header titles", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={[row]} years={[2017]} />);
    expect(html).toContain('title="Gap = shows since last played"');
    expect(html).toContain('title="Rotation = share of shows since debut"');
  });
});

describe("SongIndexTable sortable headers", () => {
  const years = [2017, 2018, 2019];
  const hrefFor = (key: string) => (key === "played" ? "/songs" : `/songs?sort=${key}`);

  it("renders plain headers when no sort links are provided", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={[row]} years={years} />);
    expect(html).not.toContain("?sort=");
    expect(html).not.toContain("aria-sort");
  });

  it("links each stat header to its catalog sort and carets the active one", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={[row]} years={years} sort={{ active: "played", hrefFor }} />);
    for (const key of ["az", "rotation", "overdue", "recent", "debut"]) expect(html).toContain(`href="/songs?sort=${key}"`);
    expect(html).toContain('href="/songs?sort=rare"');  // active Played column offers the flip to Rarest
    expect(html).toContain('aria-sort="descending"');   // ...and declares its order
    expect(html).toContain("▾");
  });

  it("marks the A–Z sort as ascending", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={[row]} years={years} sort={{ active: "az", hrefFor }} />);
    expect(html).toContain('aria-sort="ascending"');
    expect(html).not.toContain('aria-sort="descending"');
    expect(html).toContain("▴");
  });

  it("treats rare as the Played column's ascending twin and flips back on click", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={[row]} years={years} sort={{ active: "rare", hrefFor }} />);
    expect(html).toContain('aria-sort="ascending"');
    expect(html).toContain('href="/songs"');            // clicking Played returns to the descending default
    expect(html).toContain("▴");
  });
});

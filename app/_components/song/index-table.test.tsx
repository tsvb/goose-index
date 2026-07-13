import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SongIndexTable, albumHeading, UNRELEASED } from "./index-table";
import type { SongIndexRow } from "@/lib/queries/songs";

const row: SongIndexRow = {
  songId: 1, name: "Hot Tea", slug: "hot-tea", isOriginal: true,
  timesPlayed: 187, rotationPct: 29, currentGap: 3, lastPlayedDate: "2026-06-12",
  debutYear: 2017, playsPerYear: [2, 5, 4, 1, 7, 9, 10, 8, 6, 5],
  album: null,
};

const onAlbum = (over: Partial<SongIndexRow> & { songId: number; name: string }): SongIndexRow => ({
  ...row, slug: over.name.toLowerCase().replace(/\W+/g, "-"), ...over,
});
const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
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

// Sorting by album groups the catalog into a discography. The rows arrive in
// album order from the query; the table only has to notice where one ends.
describe("SongIndexTable grouped by album", () => {
  const rows: SongIndexRow[] = [
    onAlbum({ songId: 1, name: "Big Modern!", album: { title: "BIG MODERN!", slug: "big-modern", releaseDate: "2026-06-12", trackNum: 2 } }),
    onAlbum({ songId: 2, name: "Good2B", album: { title: "BIG MODERN!", slug: "big-modern", releaseDate: "2026-06-12", trackNum: 6 } }),
    onAlbum({ songId: 3, name: "Rockdale", album: { title: "Chain Yer Dragon", slug: "cyd", releaseDate: "2025-08-14", trackNum: 11 } }),
    onAlbum({ songId: 4, name: "Arcadia", album: null }),
    onAlbum({ songId: 5, name: "Wysteria Lane", album: null }),
  ];

  it("opens a section per album, and only when the album changes", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={rows} years={YEARS} groupByAlbum />);
    // Two songs from BIG MODERN! share one heading, not two.
    expect(html.match(/BIG MODERN!/g)).toHaveLength(1);
    expect(html).toContain("Chain Yer Dragon");
    expect(html.match(/class="song-group"/g)).toHaveLength(3); // 2 albums + Unreleased
  });

  it("gathers songs with no studio release under Unreleased, at the end", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={rows} years={YEARS} groupByAlbum />);
    expect(html).toContain(UNRELEASED);
    expect(html).toContain("no studio release");
    // About half of Goose's originals have never been released — it's a finding,
    // so it gets a heading rather than a blank cell.
    expect(html.indexOf(UNRELEASED)).toBeGreaterThan(html.indexOf("Chain Yer Dragon"));
  });

  it("stamps the release year on the heading", () => {
    expect(albumHeading(rows[0])).toBe("BIG MODERN! · 2026");
    expect(albumHeading(rows[3])).toBe(UNRELEASED);
  });

  it("draws no sections at all under any other sort", () => {
    const html = renderToStaticMarkup(<SongIndexTable rows={rows} years={YEARS} />);
    expect(html).not.toContain("song-group");
    expect(html).not.toContain(UNRELEASED);
  });
});

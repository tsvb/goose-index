import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppearsOn } from "./appears-on";
import type { SongAlbum } from "@/lib/queries/songs";

const single: SongAlbum = {
  title: "Dripfield", releaseDate: "2020-05-15", trackNum: 1, url: "https://goosetheband.bandcamp.com/track/dripfield", numTracks: 1,
};
const albumTrack: SongAlbum = {
  title: "Shenanigans Nite Club", releaseDate: "2022-04-29", trackNum: 4, url: "https://goosetheband.bandcamp.com/album/shenanigans-nite-club", numTracks: 10,
};
const noBandcamp: SongAlbum = {
  title: "Some Bootleg Comp", releaseDate: null, trackNum: 2, url: null, numTracks: 3,
};

describe("AppearsOn — nothing to show", () => {
  it("renders nothing (fancy or minimal) when there are no albums", () => {
    expect(renderToStaticMarkup(<AppearsOn albums={[]} />)).toBe("");
    expect(renderToStaticMarkup(<AppearsOn albums={[]} minimal />)).toBe("");
  });
});

describe("AppearsOn minimal", () => {
  it("lists releases as inline prose behind an 'Appears on:' label", () => {
    const html = renderToStaticMarkup(<AppearsOn albums={[single, albumTrack]} minimal />);
    expect(html).toContain("<strong>Appears on:</strong>");
    expect(html).toContain("Dripfield");
    expect(html).toContain("Shenanigans Nite Club");
    expect(html).toContain("; ");
    expect(html).toContain("(2020)");
    expect(html).toContain(single.url);
  });
});

describe("AppearsOn fancy", () => {
  it("labels the list with a lowercase faint label, not the .eyebrow pill", () => {
    const html = renderToStaticMarkup(<AppearsOn albums={[single]} />);
    expect(html).toContain("appears on");
    expect(html).not.toContain('class="eyebrow"');
    expect(html).not.toMatch(/class="[^"]*\beyebrow\b/);
  });

  it("rows read as plain text, not surface cards", () => {
    const html = renderToStaticMarkup(<AppearsOn albums={[single, noBandcamp]} />);
    expect(html).not.toContain("rounded border");
    expect(html).not.toContain("bg-surface/60");
    expect(html).not.toContain("hover:border-sage");
    expect(html).not.toContain("hover:bg-surface-2");
  });

  it("underlines and turns spruce on hover for a Bandcamp-linked row", () => {
    const html = renderToStaticMarkup(<AppearsOn albums={[single]} />);
    const titleIdx = html.indexOf(">Dripfield<"); // not the "Buy Dripfield…" title attr
    const titleTag = html.slice(html.lastIndexOf("<span", titleIdx), titleIdx);
    expect(titleTag).toContain("group-hover:text-spruce");
    expect(titleTag).toContain("group-hover:underline");
    const rowIdx = html.lastIndexOf("<a", titleIdx);
    const rowTag = html.slice(rowIdx, html.indexOf(">", rowIdx));
    expect(rowTag).toContain(`href="${single.url}"`);
    expect(rowTag).toContain('target="_blank"');
  });

  it("renders a release with no Bandcamp link as a plain span, not an anchor", () => {
    const html = renderToStaticMarkup(<AppearsOn albums={[noBandcamp]} />);
    const idx = html.indexOf("Some Bootleg Comp");
    expect(html.slice(0, idx)).not.toMatch(/<a[^>]*$/);
  });

  it("keeps the release-kind + track metadata (single / EP / N tracks · track M)", () => {
    const html = renderToStaticMarkup(<AppearsOn albums={[single, albumTrack, noBandcamp]} />);
    expect(html).toContain("single");
    expect(html).toContain("10 tracks · track 4");
    expect(html).toContain("3 tracks · track 2");
  });

  it("shows the Bandcamp affordance only for linkable releases", () => {
    const html = renderToStaticMarkup(<AppearsOn albums={[single, noBandcamp]} />);
    expect(html.match(/Bandcamp.↗/g)?.length).toBe(1); // the ↗ badge, not the buy-link title attr
  });
});

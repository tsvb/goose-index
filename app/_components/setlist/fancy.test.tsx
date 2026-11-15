import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SetlistFancy } from "./fancy";
import type { SetlistEntry } from "@/lib/queries/shows";

function entry(p: Partial<SetlistEntry>): SetlistEntry {
  return {
    uniqueId: Math.random().toString(36).slice(2),
    songId: 1, song: "X", slug: null, setType: "Set", setNumber: "1",
    position: 1, trackTime: null, transition: null, isJamchart: false,
    jamchartNotes: null, isReprise: false, isOriginal: true,
    originalArtist: null, footnote: null, gap: null, isDustedOff: false, ...p,
  };
}

describe("SetlistFancy", () => {
  it("renders an ordered list with song names and a jam flame", () => {
    const html = renderToStaticMarkup(
      <SetlistFancy entries={[entry({ song: "Madhuvan", isJamchart: true, jamchartNotes: "huge" })]} showDate="2024-04-20" venue={null} />,
    );
    expect(html).toContain("<ol");
    expect(html).toContain("Madhuvan");
    expect(html).toContain("<svg"); // the flame mark
  });
  it("renders footnotes as visible numbered endnotes, restarting per set", () => {
    const html = renderToStaticMarkup(
      <SetlistFancy entries={[
        entry({ uniqueId: "a", song: "Butter Rum", footnote: "First time played." }),
        entry({ uniqueId: "b", song: "Jive II", position: 2, footnote: "With guest horns." }),
        entry({ uniqueId: "c", song: "Arrow", setNumber: "2", position: 1, footnote: "Tease." }),
      ]} showDate="2024-04-20" venue={null} />,
    );
    // note text is in the DOM, not just a title attribute
    expect(html).toContain("First time played.");
    expect(html).toContain("With guest horns.");
    expect(html).toContain("Tease.");
    // superscript marker links to the endnote
    expect(html).toContain('href="#fn-a"');
    expect(html).toContain('id="fn-a"');
    // numbering restarts per set: both sets open with a ¹ marker
    expect(html.match(/>1<\/a><\/sup>/g)).toHaveLength(2);
    expect(html).not.toContain("cursor-help");
  });
  // elgoose footnotes a cover with its artist; the row already prints it.
  it("does not number or list a footnote that only repeats the cover artist", () => {
    const html = renderToStaticMarkup(
      <SetlistFancy entries={[
        entry({ uniqueId: "a", song: "Look Out Cleveland", isOriginal: false, originalArtist: "The Band", footnote: "The Band." }),
        entry({ uniqueId: "b", song: "Pancakes", position: 2, footnote: "With Dragonfly jam." }),
      ]} showDate="2026-11-14" venue={null} />,
    );
    expect(html).not.toContain('href="#fn-a"');
    expect(html).not.toContain('id="fn-a"');
    // the artist is still on the row, once
    expect(html.match(/The Band/g)).toHaveLength(1);
    // the real note keeps its number — and it is 1, not 2
    expect(html).toContain("With Dragonfly jam.");
    expect(html).toContain('href="#fn-b"');
    expect(html.match(/>1<\/a><\/sup>/g)).toHaveLength(1);
  });
  it("keeps a cover's footnote when it says more than the artist", () => {
    const html = renderToStaticMarkup(
      <SetlistFancy entries={[
        entry({ uniqueId: "a", song: "Eminence Front", isOriginal: false, originalArtist: "The Who", footnote: "The Who. First time played." }),
      ]} showDate="2026-11-14" venue={null} />,
    );
    expect(html).toContain("First time played.");
    expect(html).toContain('id="fn-a"');
  });
  // The notes start where the song names start (pl-12 = a row's pl-4 + w-5
  // marker + gap-3) under a rule. The indent is padding, not margin, so the
  // rule itself runs the full width of the set.
  it("indents the notes under the song names, below a rule", () => {
    const html = renderToStaticMarkup(
      <SetlistFancy entries={[entry({ uniqueId: "a", song: "Pancakes", footnote: "With Dragonfly jam." })]} showDate="2026-11-14" venue={null} />,
    );
    const list = /<ul class="([^"]*)"/.exec(html)?.[1] ?? "";
    expect(list).toMatch(/\bpl-12\b/);
    expect(list).not.toMatch(/\bml-/);
    expect(list).toMatch(/\bborder-t\b/);
  });
  it("renders set labels as h2 — no h1→h3 skip under the show page's h1", () => {
    const html = renderToStaticMarkup(
      <SetlistFancy entries={[entry({ song: "Madhuvan" })]} showDate="2024-04-20" venue={null} />,
    );
    expect(html).toContain("<h2");
    expect(html).not.toContain("<h3");
  });
  it("renders an empty-state when there are no entries", () => {
    const html = renderToStaticMarkup(<SetlistFancy entries={[]} showDate="2024-04-20" venue={null} />);
    expect(html).toContain("No setlist");
  });
  it("renders the empty state as a nil sentence, not a dashed box", () => {
    // The spec's empty-state rule: a nil sentence ending in an em dash, no
    // dashed boxes — this used to be a rounded-lg dashed-border card.
    const html = renderToStaticMarkup(<SetlistFancy entries={[]} showDate="2024-04-20" venue={null} />);
    expect(html).not.toContain("border-dashed");
    expect(html).not.toContain("rounded-lg");
    expect(html).toContain("—"); // NilState's em-dash convention
  });
  it("links the song and marks a Dusted Off return with a pen note and its title", () => {
    const html = renderToStaticMarkup(<SetlistFancy entries={[entry({ song: "Hot Tea", slug: "hot-tea", gap: 52, isDustedOff: true })]} showDate="2024-04-20" venue={null} />);
    expect(html).toContain('href="/songs/hot-tea"');
    expect(html).toContain("first in 52 shows");
    expect(html).toContain('title="First play in 52 shows"');
    expect(html).toContain("italic");
    expect(html).not.toContain("border-ember/45"); // no pill border on the row anymore
  });
  it("renders a one-line legend decoding the marks, but not on the empty state", () => {
    const html = renderToStaticMarkup(<SetlistFancy entries={[entry({ song: "Hot Tea" })]} showDate="2024-04-20" venue={null} />);
    expect(html).toContain("Reading the ledger");
    expect(html).toContain("segue");
    expect(html).toContain("jam chart pick");
    // Dusted Off is a pen note that names itself — no separate legend entry.
    expect(html).not.toContain("first play in n shows");
    const empty = renderToStaticMarkup(<SetlistFancy entries={[]} showDate="2024-04-20" venue={null} />);
    expect(empty).not.toContain("Reading the ledger");
  });
  it("spends ember on heat only — flames and the pen note, never the segue caret", () => {
    const html = renderToStaticMarkup(
      <SetlistFancy entries={[
        entry({ uniqueId: "a", song: "Hot Tea", transition: ">", isJamchart: true, jamchartNotes: "huge" }),
        entry({ uniqueId: "b", song: "Arcadia", position: 2, gap: 52, isDustedOff: true }),
      ]} showDate="2024-04-20" venue={null} />,
    );
    // Inline flame + endnote flame + legend flame all wear ember, none steel.
    expect(html.match(/<svg[^>]*class="[^"]*text-ember/g)).toHaveLength(3);
    expect(html).not.toMatch(/<svg[^>]*class="[^"]*text-steel/);
    expect(html).not.toMatch(/text-gold/);
    // The Dusted Off return is a pencil margin note now, not an ember pill.
    expect(html).toContain("first in 52 shows");
    expect(html).toContain('title="First play in 52 shows"');
    expect(html).not.toContain("border-ember/45");
    // Segue carets (row + legend) now wear steel — structure, not heat.
    expect(html).toContain('<span class="mr-1 select-none text-steel">›</span>');
    expect(html).toContain('<span class="text-steel">›</span>');
    // The legend no longer decodes Dusted Off — the pen note explains itself.
    expect(html).not.toContain("Dusted Off · n");
  });
  it("tags every row with the setlist-row hook the almanac themes rule", () => {
    const entries = [
      entry({ uniqueId: "a", song: "Hot Tea" }),
      entry({ uniqueId: "b", song: "Arcadia", position: 2 }),
      entry({ uniqueId: "c", song: "Arrow", setNumber: "2", position: 1 }),
    ];
    const html = renderToStaticMarkup(<SetlistFancy entries={entries} showDate="2024-04-20" venue={null} />);
    expect(html.match(/<li class="setlist-row /g)).toHaveLength(entries.length);
  });
  it("labels the per-track listen link for assistive tech", () => {
    const html = renderToStaticMarkup(<SetlistFancy entries={[entry({ song: "Hot Tea" })]} showDate="2024-04-20" venue={null} />);
    expect(html).toContain('aria-label="Listen to Hot Tea on nugs"');
  });
  it("emits a per-track applenugs link", () => {
    const html = renderToStaticMarkup(
      <SetlistFancy
        entries={[entry({ song: "Hot Tea", setNumber: "1", position: 2 })]}
        showDate="2024-04-20"
        venue="The Salt Shed"
      />,
    );
    expect(html).toContain('href="applenugs://show/2024-04-20');
    expect(html).toContain("song=Hot%20Tea");
    expect(html).toContain("set=1");
    expect(html).toContain("pos=2");
  });
  it("the row's web fallback is the exact release when a container is known, and search otherwise", () => {
    const withContainer = renderToStaticMarkup(
      <SetlistFancy entries={[entry({ song: "Hot Tea" })]} showDate="2024-04-20" venue="The Salt Shed" containerId={46887} />,
    );
    expect(withContainer).toMatch(/<a[^>]*class="nugs-track ml-1 shrink-0"[^>]*data-fallback="https:\/\/play\.nugs\.net\/release\/46887"/);

    const withoutContainer = renderToStaticMarkup(
      <SetlistFancy entries={[entry({ song: "Hot Tea" })]} showDate="2024-04-20" venue="The Salt Shed" containerId={null} />,
    );
    expect(withoutContainer).toMatch(/<a[^>]*class="nugs-track ml-1 shrink-0"[^>]*data-fallback="https:\/\/play\.nugs\.net\/#\/search\?searchTerm=Goose%202024-04-20"/);
  });
});

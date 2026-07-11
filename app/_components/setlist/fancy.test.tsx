import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SetlistFancy } from "./fancy";
import type { SetlistEntry } from "@/lib/queries/shows";

function entry(p: Partial<SetlistEntry>): SetlistEntry {
  return {
    uniqueId: Math.random().toString(36).slice(2),
    songId: 1, song: "X", slug: null, setType: "Set", setNumber: "1",
    position: 1, trackTime: null, transition: null, isJamchart: false,
    jamchartNotes: null, isJam: false, isReprise: false, isOriginal: true,
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
  it("renders an empty-state when there are no entries", () => {
    const html = renderToStaticMarkup(<SetlistFancy entries={[]} showDate="2024-04-20" venue={null} />);
    expect(html).toContain("No setlist");
  });
  it("links the song and marks a Dusted Off return", () => {
    const html = renderToStaticMarkup(<SetlistFancy entries={[entry({ song: "Hot Tea", slug: "hot-tea", gap: 52, isDustedOff: true })]} showDate="2024-04-20" venue={null} />);
    expect(html).toContain('href="/songs/hot-tea"');
    expect(html).toContain("Dusted Off");
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
});

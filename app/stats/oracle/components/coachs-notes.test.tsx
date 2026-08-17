import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CoachsNotes } from "./coachs-notes";
import type { CoachsNoteRow } from "@/lib/queries/discoveries";

function note(overrides: Partial<CoachsNoteRow> = {}): CoachsNoteRow {
  return {
    showId: 1,
    showDate: "2024-06-01",
    showOrder: null,
    venueName: "Red Rocks",
    coachNotes: "A rare full-band jam vehicle tonight.",
    bandcampUrl: "https://goose.bandcamp.com/album/2024-06-01",
    ...overrides,
  };
}

describe("CoachsNotes", () => {
  it("carries the Bandcamp link on the chrome-link pattern, not the retired gold utility", () => {
    const html = renderToStaticMarkup(<CoachsNotes data={[note()]} />);
    const idx = html.indexOf("Listen");
    const linkTag = html.slice(html.lastIndexOf("<a", idx), html.indexOf(">", idx) + 1);
    expect(linkTag).toContain("text-spruce");
    expect(linkTag).toContain("hover:text-ink");
    expect(linkTag).not.toContain("text-gold");
  });

  it("still prints the note text and its date as evidence, as a liner note", () => {
    const html = renderToStaticMarkup(<CoachsNotes data={[note()]} />);
    expect(html).toContain("A rare full-band jam vehicle tonight.");
    expect(html).toContain("2024-06-01");
    expect(html).toContain("Red Rocks");
  });

  it("renders an empty state rather than an empty list", () => {
    expect(renderToStaticMarkup(<CoachsNotes data={[]} />)).toContain("notes archived yet");
  });
});

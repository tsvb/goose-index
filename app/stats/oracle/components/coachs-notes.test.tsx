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
    const html = renderToStaticMarkup(<CoachsNotes edition="functional" data={[note()]} />);
    const idx = html.indexOf("Listen");
    const linkTag = html.slice(html.lastIndexOf("<a", idx), html.indexOf(">", idx) + 1);
    expect(linkTag).toContain("text-spruce");
    expect(linkTag).toContain("hover:text-ink");
    expect(linkTag).not.toContain("text-gold");
  });

  it("still prints the note text and its date as evidence, as a liner note", () => {
    const html = renderToStaticMarkup(<CoachsNotes edition="functional" data={[note()]} />);
    expect(html).toContain("A rare full-band jam vehicle tonight.");
    expect(html).toContain("2024-06-01");
    expect(html).toContain("Red Rocks");
  });

  it("renders an empty state rather than an empty list", () => {
    expect(renderToStaticMarkup(<CoachsNotes edition="functional" data={[]} />)).toContain("notes archived yet");
  });
});

describe("CoachsNotes card (3.0)", () => {
  const release = note({
    coachNotes:
      "2024/06/01 Red Rocks Amphitheatre, Morrison, CO\n\nSet 1: Arcadia [1] -> Hot Tea\n\nCoach's Notes:\n [1] Unfinished.",
  });
  const html = renderToStaticMarkup(<CoachsNotes edition="fancy" data={[release]} />);

  it("prints the notes on card stock with the show's date tile, not a J-card spine", () => {
    expect(html).toContain("coach-card");
    expect(html).toContain("var(--card-stock)");
    expect(html).toContain("yeti-tile yeti-tile-sm");
    expect(html).not.toContain("writing-mode");
    expect(html).not.toContain("repeating-linear-gradient");
  });

  it("lays the notes out as rows and footnotes, keeping every word", () => {
    expect(html).toContain("Red Rocks Amphitheatre, Morrison, CO");
    expect(html).toContain('lowercase text-muted">Set 1</span>');
    expect(html).toContain("Arcadia [1] -&gt; Hot Tea");
    expect(html).toContain("Coach&#x27;s Notes");
    expect(html).toContain('text-faint">[1]</span> Unfinished.');
  });

  it("falls back to the venue name when the notes don't open with a place line", () => {
    const plain = renderToStaticMarkup(<CoachsNotes edition="fancy" data={[note()]} />);
    expect(plain).toContain("Red Rocks");
    expect(plain).toContain("A rare full-band jam vehicle tonight.");
  });

  it("offers listen as an outline button to the Bandcamp release", () => {
    expect(html).toMatch(/<a href="https:\/\/goose\.bandcamp\.com[^>]*rounded-full[^>]*>listen ↗<\/a>/);
  });

  it("gives a row after the footnotes air above its hairline", () => {
    const after = renderToStaticMarkup(
      <CoachsNotes edition="fancy" data={[note({ coachNotes: "Coach's Notes:\n [1] Unfinished.\n\nShow Notes: One set." })]} />,
    );
    expect(after).toContain('py-2 text-[0.9rem] mt-2"><span class="font-extrabold lowercase text-muted">Show Notes');
    // ...and only there.
    expect(html).not.toContain("mt-2\"><span");
  });
});

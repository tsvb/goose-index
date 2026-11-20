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

describe("CoachsNotes card (3.0): each note on its song", () => {
  const release = note({
    venueName: "Red Rocks Amphitheatre",
    coachNotes:
      "2024/06/01 Red Rocks Amphitheatre, Morrison, CO\n\nSet 1: Arcadia [1] -> Hot Tea [2], Drive [1]\n\nEncore: Bear [3]\n\nCoach's Notes:\n [1] Unfinished.\n [2] Kylie Minogue.\n [3] Otis Day & The Knights. With a tease from Rick.\n\nShow Notes: One set, due to weather.",
  });
  const html = renderToStaticMarkup(<CoachsNotes edition="fancy" data={[release]} />);

  it("files the release like a show: date tile beside the venue and its city, no J-card spine", () => {
    expect(html).toContain("coach-card");
    expect(html).toContain("yeti-tile yeti-tile-sm w-[64px]");
    expect(html).toMatch(/<h3[^>]*><span class="sr-only">Jun 1, 2024 · <\/span>Red Rocks Amphitheatre<\/h3>/);
    expect(html).toContain(">Morrison, CO<");
    expect(html).not.toContain("writing-mode");
  });

  it("puts each short note on the song it marks, on every song it marks, and drops the numbers", () => {
    expect(html).toMatch(/>Arcadia<\/span><span class="yeti-tag[^"]*">Unfinished<\/span>/);
    expect(html).toMatch(/>Drive<\/span><span class="yeti-tag[^"]*">Unfinished<\/span>/);
    expect(html).toMatch(/>Hot Tea<\/span><span class="whitespace-nowrap"><span class="yeti-tag[^"]*">Kylie Minogue<\/span><span class="text-muted">,<\/span><\/span>/);
    expect(html).not.toMatch(/\[\d\]/);
    expect(html).not.toContain("Coach&#x27;s Notes");
  });

  it("typesets the band's -> as →, and keeps a long note as a line under its set, with its song", () => {
    expect(html).toContain("→</span>");
    expect(html).toMatch(/>Bear<\/span>Otis Day &amp; The Knights\. With a tease from Rick\.<\/p>/);
    expect(html).toContain('lowercase">Show Notes</b> One set, due to weather.');
  });

  it("offers Bandcamp as the one snow button, and the show a link away", () => {
    expect(html).toMatch(/<a href="https:\/\/goose\.bandcamp\.com[^>]*bg-\[var\(--snow\)\][^>]*>listen on bandcamp ↗<\/a>/);
    expect(html).toContain('href="/shows/2024-06-01"');
    expect(html).toContain("the show →");
  });

  it("keeps notes with no place line or no marks whole", () => {
    const plain = renderToStaticMarkup(<CoachsNotes edition="fancy" data={[note()]} />);
    expect(plain).toContain("Red Rocks");
    expect(plain).toContain("A rare full-band jam vehicle tonight.");
  });

  it("explains the marks once, under the cards", () => {
    expect(html).toContain("› and → are the band&#x27;s own &gt; and -&gt;; a tag is the coach&#x27;s note on the song before it.");
  });
});

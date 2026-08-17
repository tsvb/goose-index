import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SectionRule, Ledger, LedgerEntry, TonightEntry, ContentsRow, Figure } from "./forms";
import type { ShowSummary } from "@/lib/queries/shows";

const show: ShowSummary = {
  showId: 1,
  date: "2026-08-12",
  order: null,
  venue: "The Salt Shed",
  city: "Chicago",
  state: "IL",
  country: "USA",
  tour: "Summer Tour 2026",
  tourId: null,
  songCount: 19,
  hasNotes: true,
};

describe("SectionRule", () => {
  it("draws a lowercase heading over a strong pen rule", () => {
    const html = renderToStaticMarkup(<SectionRule title="latest shows" seed="latest" />);
    expect(html).toMatch(/<h2[^>]*>latest shows<\/h2>/);
    expect(html).toContain("text-pencil"); // the pen rule
    expect(html).not.toContain("opacity"); // strong, not faint
  });
  it("offers the optional spruce link", () => {
    const html = renderToStaticMarkup(
      <SectionRule title="latest shows" seed="latest" href="/shows" linkLabel="browse all shows" />,
    );
    expect(html).toContain('href="/shows"');
    expect(html).toContain("browse all shows");
    expect(html).toContain("text-spruce");
  });
  it("no href, no link", () => {
    const html = renderToStaticMarkup(<SectionRule title="t" seed="s" />);
    expect(html).not.toContain("<a");
  });
});

describe("Ledger", () => {
  it("rules between entries, not around them", () => {
    const html = renderToStaticMarkup(
      <Ledger seed="l">
        <span>one</span>
        <span>two</span>
        <span>three</span>
      </Ledger>,
    );
    // 3 entries → exactly 2 faint separator rules.
    expect(html.match(/opacity/g)?.length).toBe(2);
  });
  it("a single entry needs no rule at all", () => {
    const html = renderToStaticMarkup(
      <Ledger seed="l">
        <span>only</span>
      </Ledger>,
    );
    expect(html).not.toContain("opacity");
  });
  it("each row carries the ledger-row hook for CSS striping", () => {
    const html = renderToStaticMarkup(
      <Ledger seed="l">
        <span>one</span>
        <span>two</span>
        <span>three</span>
      </Ledger>,
    );
    // ledger-row class must be present on each row wrapper (not on separator rules)
    const matches = html.match(/class="ledger-row"/g);
    expect(matches).not.toBeNull();
    expect(matches?.length).toBe(3);
  });
});

describe("LedgerEntry", () => {
  it("is one whole-row link with date, venue, place, and count", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={show} />);
    expect(html).toContain('href="/shows/2026-08-12"');
    expect(html).toContain("aug 12");
    expect(html).toContain("wed");
    expect(html).toContain("The Salt Shed"); // authored content keeps its casing
    expect(html).toContain("Chicago, IL");
    expect(html).toContain("19 songs");
    expect(html).toContain("notes");
    expect(html).toContain("text-steel"); // the date wears structure
  });
  it("no setlist reads as a nil, not a zero", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={{ ...show, songCount: 0, hasNotes: false }} />);
    expect(html).not.toContain("0 songs");
    expect(html).toContain("—");
  });
  it("stays a flat row — no card classes", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={show} />);
    expect(html).not.toMatch(/rounded|shadow|bg-surface/);
  });
  it("venue context: the date takes the display slot", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={show} context="venue" />);
    expect(html).toContain("aug 12, 2026");
    expect(html).not.toContain("The Salt Shed");
  });
  it("tour context drops the repeated tour name", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={show} context="tour" />);
    expect(html).not.toContain("Summer Tour 2026");
  });
  it("venue context with no tour falls back to the lowercase weekday", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={{ ...show, tour: null }} context="venue" />);
    expect(html).toContain(">wednesday<");
    expect(html).not.toContain("Summer Tour 2026");
  });
  it("keeps the tour eyebrow's authored casing — tour names never case-fold", () => {
    const html = renderToStaticMarkup(<LedgerEntry show={show} />);
    const idx = html.indexOf("Summer Tour 2026");
    expect(idx).toBeGreaterThan(-1);
    const tag = html.slice(html.lastIndexOf("<span", idx), idx);
    expect(tag).not.toMatch(/\blowercase\b/);
  });
});

describe("TonightEntry", () => {
  it("the dot wears hand, the word wears ember", () => {
    const html = renderToStaticMarkup(<TonightEntry show={{ ...show, songCount: 0, hasNotes: false }} />);
    expect(html).toContain('href="/shows/2026-08-12"');
    expect(html).toContain("tonight");
    expect(html).toContain("text-ember"); // running text needs AA, not the mark-only hand
    expect(html).not.toContain("text-hand");
    expect(html).toContain("bg-hand"); // the dot is a mark — 3:1 is enough
    expect(html).toContain("animate-pulse");
    expect(html).toContain("motion-reduce:animate-none");
    expect(html).toContain("the setlist will appear live");
  });
});

describe("ContentsRow", () => {
  it("is a text row: label, sub, no icon circles", () => {
    const html = renderToStaticMarkup(<ContentsRow href="/songs" label="songs" sub="615 songs, sorted any way" />);
    expect(html).toContain('href="/songs"');
    expect(html).toContain("songs");
    expect(html).toContain("615 songs, sorted any way");
    expect(html).not.toMatch(/rounded-full|<svg/);
  });
});

describe("Figure", () => {
  it("is a numeral over a lowercase label", () => {
    const html = renderToStaticMarkup(<Figure value="823" label="shows" />);
    expect(html).toContain("823");
    expect(html).toContain("shows");
    expect(html).toContain("tabular-nums");
  });
});

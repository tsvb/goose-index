import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ShowDetail, ShowNeighbor } from "@/lib/queries/shows";

const h = vi.hoisted(() => ({
  experience: "fancy",
  details: [] as Record<string, unknown>[],
  neighbors: { prev: null, next: null } as {
    prev: Record<string, unknown> | null;
    next: Record<string, unknown> | null;
  },
  entryNumber: null as number | null,
}));

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/sync/maybe-live", () => ({ maybeLiveSync: async () => {} }));
vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/shows", () => ({
  getShowDetails: async () => h.details as unknown as ShowDetail[],
  getSetlist: async () => [],
  getShowNeighbors: async () => h.neighbors as unknown as { prev: ShowNeighbor; next: ShowNeighbor },
  getShowEntryNumber: async () => h.entryNumber,
}));
// Heavy children exercised by their own colocated tests; stubbed to keep this on the nav blocks.
vi.mock("@/app/_components/setlist", () => ({ Setlist: () => null }));
vi.mock("@/app/_components/show-header", () => ({ ShowHeader: () => null }));

import ShowPage, { generateMetadata } from "./page";

function show(showId: number, order: number, date = "2025-06-25") {
  return {
    showId, date, order, venue: "Venue A", city: "Port Chester", state: "NY", country: "USA",
    tour: null, tourId: null, songCount: 10, hasNotes: false, venueId: 1, permalink: `p${showId}`, notes: null,
  };
}

function neighbor(date: string, order: number) {
  return { date, order, venue: "Venue A", city: "Port Chester", state: "NY" };
}

async function render(date: string, n?: string) {
  const el = await ShowPage({
    params: Promise.resolve({ date }),
    searchParams: Promise.resolve(n ? { n } : {}),
  });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
  h.details = [show(1, 1), show(2, 2), show(3, 3)];
  h.neighbors = { prev: null, next: null };
  h.entryNumber = null;
});

describe("ShowPage prev/next navigation", () => {
  it("labels same-date neighbors as earlier/later shows this day", async () => {
    h.neighbors = { prev: neighbor("2025-06-25", 1), next: neighbor("2025-06-25", 3) };
    const html = await render("2025-06-25", "2");
    expect(html).toContain("Earlier show this day");
    expect(html).toContain("Later show this day");
    expect(html).not.toContain("Previous night");
    expect(html).not.toContain("Next night");
    // top-bar links get the same words as their title
    expect(html).toContain('title="Earlier show this day"');
    expect(html).toContain('title="Later show this day"');
  });

  it("keeps night labels for cross-date neighbors and carries ?n= for order > 1", async () => {
    h.neighbors = { prev: neighbor("2025-06-24", 1), next: neighbor("2025-06-26", 2) };
    const html = await render("2025-06-25");
    expect(html).toContain("Previous night");
    expect(html).toContain("Next night");
    expect(html).toContain('href="/shows/2025-06-24"'); // show 1 needs no ?n
    expect(html).toContain('href="/shows/2025-06-26?n=2"');
  });

  it("links a same-date next neighbor through its ?n=", async () => {
    h.details = [show(1, 1)]; // no siblings, so any ?n= href must come from the nav
    h.neighbors = { prev: null, next: neighbor("2025-06-25", 2) };
    const html = await render("2025-06-25");
    expect(html).toContain('href="/shows/2025-06-25?n=2"');
  });

  it("minimal gets the same-day words inline", async () => {
    h.experience = "minimal";
    h.neighbors = { prev: neighbor("2025-06-25", 1), next: neighbor("2025-06-25", 3) };
    const html = await render("2025-06-25", "2");
    expect(html).toContain("Earlier show this day · Venue A");
    expect(html).toContain("Later show this day · Venue A");
    expect(html).toContain('href="/shows/2025-06-25?n=3"');
  });
});

describe("ShowPage no-show date recovery", () => {
  it("renders a friendly no-show page (not a 404) for a valid date with no show", async () => {
    h.details = []; // valid date, nothing logged
    h.neighbors = { prev: neighbor("2019-03-16", 1), next: neighbor("2019-03-22", 1) };
    const html = await render("2019-03-19");
    expect(html).toContain("No show logged");
    expect(html).toContain("Goose didn’t play this night (or it isn’t logged).");
    // recovery paths: the year, the neighbors on either side, and On This Day
    expect(html).toContain('href="/shows?year=2019"');
    expect(html).toContain("Browse 2019 shows");
    expect(html).toContain('href="/on-this-day"');
    expect(html).toContain("Nearest before");
    expect(html).toContain("Nearest after");
    expect(html).toContain('href="/shows/2019-03-16"');
    expect(html).toContain('href="/shows/2019-03-22"');
  });

  it("gives the no-show page a plain Doc in minimal mode", async () => {
    h.experience = "minimal";
    h.details = [];
    h.neighbors = { prev: neighbor("2019-03-16", 1), next: neighbor("2019-03-22", 2) };
    const html = await render("2019-03-19");
    expect(html).toContain("doc-crumb"); // breadcrumb, not the fancy hero
    expect(html).toContain("No show on Tuesday, March 19, 2019");
    expect(html).toContain("Nearest shows");
    expect(html).toContain("Before:");
    expect(html).toContain("After:");
    // order > 1 neighbor carries ?n=; order 1 does not
    expect(html).toContain('href="/shows/2019-03-16"');
    expect(html).toContain('href="/shows/2019-03-22?n=2"');
    expect(html).toContain('href="/shows?year=2019"');
    expect(html).not.toContain("stage-glow"); // no fancy hero leaking in
  });

  it("still hard-404s a shape-invalid date", async () => {
    h.details = [];
    await expect(render("2019-13-99")).rejects.toThrow("notFound");
  });

  it("titles the no-show page but keeps 'Show not found' for garbage", async () => {
    h.details = [];
    const noShow = await generateMetadata(
      { params: Promise.resolve({ date: "2019-03-19" }), searchParams: Promise.resolve({}) },
      {} as never,
    );
    expect(noShow.title).toBe("No show on Mar 19, 2019");
    // Self-canonical so the recovery page doesn't get consolidated into a random show.
    expect(noShow.alternates?.canonical).toBe("https://www.gooseindex.com/shows/2019-03-19");
    const garbage = await generateMetadata(
      { params: Promise.resolve({ date: "2019-13-99" }), searchParams: Promise.resolve({}) },
      {} as never,
    );
    expect(garbage.title).toBe("Show not found");
    // No canonical for garbage — nothing to point at.
    expect(garbage.alternates).toBeUndefined();
  });
});

describe("ShowPage canonical URL (multi-show dates)", () => {
  const parent = { openGraph: { images: [] } } as never;

  it("canonicals show 1 to the bare date URL — never ?n=1", async () => {
    // Both no-?n and ?n=1 should resolve to show 1 (order 1) with the same bare canonical.
    for (const searchParams of [{}, { n: "1" }]) {
      const m = await generateMetadata(
        { params: Promise.resolve({ date: "2025-06-25" }), searchParams: Promise.resolve(searchParams) },
        parent,
      );
      expect(m.alternates?.canonical).toBe("https://www.gooseindex.com/shows/2025-06-25");
    }
  });

  it("canonicals a non-default show to ?n=<its order>", async () => {
    const m = await generateMetadata(
      { params: Promise.resolve({ date: "2025-06-25" }), searchParams: Promise.resolve({ n: "2" }) },
      parent,
    );
    expect(m.alternates?.canonical).toBe("https://www.gooseindex.com/shows/2025-06-25?n=2");
  });

  it("openGraph url matches the canonical (so social scrapers and Google agree)", async () => {
    const m = await generateMetadata(
      { params: Promise.resolve({ date: "2025-06-25" }), searchParams: Promise.resolve({ n: "3" }) },
      parent,
    );
    expect(m.openGraph?.url).toBe(m.alternates?.canonical);
  });
});

describe("ShowPage almanac folio + notes aside", () => {
  it("prints the folio with the computed entry number and location in fancy", async () => {
    h.entryNumber = 812;
    const html = await render("2025-06-25");
    expect(html).toContain('class="entry-folio"');
    expect(html).toContain("The Goose Almanac · Port Chester, NY · Entry No. 812 · Set from data at elgoose.net");
  });

  it("omits null location segments rather than printing blanks", async () => {
    h.entryNumber = 812;
    h.details = [{ ...show(1, 1), city: null, state: null }];
    const html = await render("2025-06-25");
    expect(html).toContain("The Goose Almanac · Entry No. 812 · Set from data at elgoose.net");
  });

  it("omits the whole folio when the show has no entry number yet", async () => {
    h.entryNumber = null; // upcoming, or nothing logged
    const html = await render("2025-06-25");
    expect(html).not.toContain("entry-folio");
    expect(html).not.toContain("The Goose Almanac");
  });

  it("keeps the folio out of minimal and functional", async () => {
    h.entryNumber = 812;
    for (const exp of ["minimal", "functional"] as const) {
      h.experience = exp;
      const html = await render("2025-06-25");
      expect(html).not.toContain("entry-folio");
    }
  });

  it("tags the notes aside with the show-notes-aside hook", async () => {
    h.details = [{ ...show(1, 1), notes: "Second Boston night." }];
    const html = await render("2025-06-25");
    expect(html).toMatch(/<aside class="show-notes-aside /);
    expect(html).toContain("Second Boston night.");
  });
});

describe("ShowPage 'Also this day' chips", () => {
  it("names each sibling's venue alongside its show number", async () => {
    h.details = [
      { ...show(1, 1), venue: "Capitol Theatre" },
      { ...show(2, 2), venue: "Brooklyn Bowl" },
    ];
    const html = await render("2025-06-25"); // renders show 1; sibling is show 2
    expect(html).toContain("Also this day");
    expect(html).toContain("Show 2");
    // The venue is named in the chip, not a bare "Show 2".
    expect(html).toContain("Brooklyn Bowl");
    expect(html).toContain('href="/shows/2025-06-25?n=2"');
  });
});

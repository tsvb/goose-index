import { describe, it, expect } from "vitest";
import { showJsonLd, siteJsonLd, blogPostingJsonLd } from "./jsonld";
import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";

const show: ShowDetail = {
  showId: 1, date: "2025-06-28", order: null, venue: "Madison Square Garden",
  city: "New York", state: "NY", country: "USA", tour: null, tourId: null,
  songCount: 2, hasNotes: false, venueId: 9, permalink: null, notes: null, bandcampUrl: null,
  nugsContainerId: null, nugsHasVideo: null,
};
const setlist = [
  { song: "Madhuvan" }, { song: "Hot Tea" },
] as SetlistEntry[];

describe("showJsonLd", () => {
  it("builds a MusicEvent with venue, performer, and ordered songs", () => {
    const ld = showJsonLd(show, setlist) as Record<string, unknown>;
    expect(ld["@type"]).toBe("MusicEvent");
    expect(ld.startDate).toBe("2025-06-28");
    expect((ld.name as string)).toContain("Madison Square Garden");
    expect((ld.performer as Record<string, unknown>).name).toBe("Goose");
    const works = ld.workPerformed as { name: string }[];
    expect(works.map((w) => w.name)).toEqual(["Madhuvan", "Hot Tea"]);
  });

  it("carries the fields Google's Event report asks for and the data supports", () => {
    const ld = showJsonLd(show, setlist) as Record<string, unknown>;
    expect(ld.endDate).toBe("2025-06-28");
    expect(ld.url).toBe("https://www.gooseindex.com/shows/2025-06-28");
    expect(ld.image).toBe("https://www.gooseindex.com/opengraph-image");
    expect(ld.description).toBe(
      "Goose setlist for Saturday, June 28, 2025 at Madison Square Garden, New York, NY.",
    );
    // No ticket or promoter data exists, so neither is asserted.
    expect("offers" in ld).toBe(false);
    expect("organizer" in ld).toBe(false);
  });

  it("describes an upcoming show without claiming a setlist; ?n= past the first show", () => {
    const ld = showJsonLd({ ...show, order: 2 }, []) as Record<string, unknown>;
    expect(ld.description).toBe(
      "Goose at Madison Square Garden, New York, NY on Saturday, June 28, 2025. No setlist logged yet.",
    );
    expect(ld.url).toBe("https://www.gooseindex.com/shows/2025-06-28?n=2");
  });
});

describe("showJsonLd on a multi-show date", () => {
  it("numbers each show in name and description", () => {
    const first = showJsonLd({ ...show, order: 1 }, setlist, [1, 2]) as Record<string, unknown>;
    const second = showJsonLd({ ...show, order: 2 }, setlist, [1, 2]) as Record<string, unknown>;
    expect(first.name).toBe("Goose at Madison Square Garden (show 1 of 2)");
    expect(second.name).toBe("Goose at Madison Square Garden (show 2 of 2)");
    expect(second.description).toBe(
      "Goose setlist for Saturday, June 28, 2025 at Madison Square Garden, New York, NY (show 2 of 2 that day).",
    );
  });

  it("adds nothing on a single-show date, or when the orders can't tell the shows apart", () => {
    const plain = "Goose at Madison Square Garden";
    expect((showJsonLd({ ...show, order: 1 }, setlist, [1]) as Record<string, unknown>).name).toBe(plain);
    // The source files some same-day pairs both as show 1.
    expect((showJsonLd({ ...show, order: 1 }, setlist, [1, 1]) as Record<string, unknown>).name).toBe(plain);
    expect((showJsonLd(show, setlist, [null, 2]) as Record<string, unknown>).name).toBe(plain);
  });
});

describe("blogPostingJsonLd", () => {
  it("builds a BlogPosting with the canonical URL; keywords only when tagged", () => {
    const meta = { slug: "a-post", title: "A post", date: "2026-07-01", summary: "S.", tags: ["site"] };
    const ld = blogPostingJsonLd(meta) as Record<string, unknown>;
    expect(ld["@type"]).toBe("BlogPosting");
    expect(ld.headline).toBe("A post");
    expect(ld.datePublished).toBe("2026-07-01");
    expect(ld.url).toBe("https://www.gooseindex.com/blog/a-post");
    expect(ld.keywords).toBe("site");
    const bare = blogPostingJsonLd({ ...meta, tags: [] }) as Record<string, unknown>;
    expect("keywords" in bare).toBe(false);
  });
});

describe("siteJsonLd", () => {
  it("describes the site as a WebSite about Goose", () => {
    const ld = siteJsonLd() as Record<string, unknown>;
    expect(ld["@type"]).toBe("WebSite");
    expect((ld.about as Record<string, unknown>).name).toBe("Goose");
  });
});

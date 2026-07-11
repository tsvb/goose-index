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
}));

vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("notFound"); } }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/sync/maybe-live", () => ({ maybeLiveSync: async () => {} }));
vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/shows", () => ({
  getShowDetails: async () => h.details as unknown as ShowDetail[],
  getSetlist: async () => [],
  getShowNeighbors: async () => h.neighbors as unknown as { prev: ShowNeighbor; next: ShowNeighbor },
}));
// Heavy children exercised by their own colocated tests; stubbed to keep this on the nav blocks.
vi.mock("@/app/_components/setlist", () => ({ Setlist: () => null }));
vi.mock("@/app/_components/show-header", () => ({ ShowHeader: () => null }));

import ShowPage from "./page";

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

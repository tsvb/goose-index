import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { VenueRow } from "@/lib/queries/dimensions";

const h = vi.hoisted(() => ({
  experience: "fancy" as "fancy" | "functional" | "minimal",
  venues: [] as unknown[],
  lastOpts: undefined as unknown,
}));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));
vi.mock("@/lib/queries/dimensions", () => ({
  listVenues: async (opts: unknown) => {
    h.lastOpts = opts;
    return h.venues;
  },
  showsByState: async () => [{ state: "CT", shows: 135, venues: 43 }, { state: "NY", shows: 107, venues: 54 }],
  showsByCountry: async () => [{ country: "Mexico", shows: 13, venues: 3 }],
}));

import VenuesPage from "./page";

const mkVenue = (over: Partial<VenueRow>): VenueRow => ({
  venueId: 1, name: "The Cap", city: "Port Chester", state: "NY", country: "USA",
  capacity: 1800, shows: 12, first: "2019-06-01", last: "2026-06-01", ...over,
});

const FIXTURE = [
  mkVenue({ venueId: 1, name: "Red Rocks Amphitheatre", city: "Morrison", state: "CO", shows: 9, capacity: 9525 }),
  mkVenue({ venueId: 2, name: "Mission Ballroom", city: "Denver", state: "CO", shows: 4, capacity: 3950 }),
  mkVenue({ venueId: 3, name: "The Capitol Theatre", city: "Port Chester", state: "NY", shows: 12 }),
  mkVenue({ venueId: 4, name: "Massey Hall", city: "Toronto", state: "ON", country: "Canada", shows: 1, capacity: 2765 }),
  mkVenue({ venueId: 5, name: "Mystery Barn", city: null, state: null, country: null, shows: 2, capacity: null }),
];

async function render(params: Record<string, string> = {}) {
  const el = await VenuesPage({ searchParams: Promise.resolve(params) });
  return renderToStaticMarkup(el);
}

beforeEach(() => {
  h.experience = "fancy";
  h.venues = FIXTURE;
  h.lastOpts = undefined;
});

describe("VenuesPage grouping", () => {
  it("groups US venues by state, others by country, unlocated last", async () => {
    const html = await render();
    // group headers in order: CO, NY (states A–Z), Canada (countries), Unlisted
    const order = ["CO", "NY", "Canada", "Unlisted"].map((l) => html.indexOf(`id="g-${l.toLowerCase()}"`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain("2 venues"); // CO group count
  });

  it("renders a jump row linking each group anchor", async () => {
    const html = await render();
    expect(html).toContain('aria-label="Jump to state"');
    for (const id of ["g-co", "g-ny", "g-canada", "g-unlisted"]) expect(html).toContain(`href="#${id}"`);
  });

  it("omits the redundant state inside a state group but keeps it for country groups", async () => {
    const html = await render();
    expect(html).toContain("Morrison<"); // city without ", CO"
    expect(html).not.toContain("Morrison, CO");
    expect(html).toContain("Toronto, ON"); // Canada group keeps the province
  });

  it("makes group headers sticky below the fancy header", async () => {
    const html = await render();
    expect(html).toContain("sticky top-16");
    h.experience = "functional";
    expect(await render()).toContain("sticky top-12"); // shorter w2 appbar
  });
});

describe("VenuesPage filter box", () => {
  it("fancy renders a GET form to /venues seeded with the current q", async () => {
    const html = await render({ q: "red" });
    expect(html).toContain('action="/venues"');
    expect(html).toContain('name="q"');
    expect(html).toContain('value="red"');
    expect(html).toContain('aria-label="Filter venues by name, city, or state"');
    expect(h.lastOpts).toEqual({ sort: "shows", q: "red" });
  });

  it("carries a non-default sort through the form and q through the sort links", async () => {
    const html = await render({ sort: "name", q: "red" });
    expect(html).toContain('name="sort" value="name"');
    expect(html).toContain('href="/venues?q=red"'); // Most shows link keeps q
    expect(html).toContain('href="/venues?sort=name&amp;q=red"');
  });

  it("functional renders the filter with a gel button", async () => {
    h.experience = "functional";
    const html = await render({ q: "red" });
    expect(html).toContain("gel");
    expect(html).toContain(">Filter</button>");
  });

  it("shows a clear-filter empty state when nothing matches", async () => {
    h.venues = [];
    const html = await render({ q: "zzz" });
    expect(html).toContain("No venues match");
    expect(html).toContain('href="/venues"');
  });
});

describe("VenuesPage minimal", () => {
  beforeEach(() => {
    h.experience = "minimal";
  });

  it("renders a plain GET filter form and grouped tables", async () => {
    const html = await render({ q: "red" });
    expect(html).toContain('action="/venues"');
    expect(html).toContain('value="red"');
    expect(html).toContain(">Filter</button>");
    expect(html).toContain('id="g-co"');
    expect(html).toContain(">CO</h2>");
    expect(html).toContain('href="#g-canada"'); // jump row
    expect(html).toContain('href="/venues/1"');
  });

  it("keeps a non-default sort across the filter form", async () => {
    const html = await render({ sort: "name" });
    expect(html).toContain('name="sort" value="name"');
  });
});

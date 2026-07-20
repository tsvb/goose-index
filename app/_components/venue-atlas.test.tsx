import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { StateShows, CountryShows, VenueRow } from "@/lib/queries/dimensions";
import { VenueAtlas, buildRosters } from "./venue-atlas";

// VenueAtlas is a server component taking plain props — no db mock needed. The
// client island server-renders its SSR baseline (mounted=false), so the coloured
// SVG is in the static markup while controls/panel/live are absent.

const mkVenue = (over: Partial<VenueRow>): VenueRow => ({
  venueId: 1, name: "The Cap", city: "Port Chester", state: "NY", country: "USA",
  capacity: 1800, shows: 12, first: "2019-06-01", last: "2026-06-01", ...over,
});

const COUNTRIES: CountryShows[] = [{ country: "Mexico", shows: 13, venues: 3 }];

const VENUES: VenueRow[] = [
  mkVenue({ venueId: 1, name: "The Capitol Theatre", city: "Port Chester", state: "NY", shows: 90 }),
  mkVenue({ venueId: 2, name: "Forest Hills Stadium", city: "Queens", state: "NY", shows: 45 }),
  mkVenue({ venueId: 3, name: "College Street Music Hall", city: "New Haven", state: "CT", shows: 40 }),
];

function render(states: StateShows[], countries = COUNTRIES, venues = VENUES) {
  return renderToStaticMarkup(<VenueAtlas states={states} countries={countries} venues={venues} />);
}

// NY hotter than CT, and WY exists in US_STATE_PATHS but is unplayed (absent from states).
const NY_HOT: StateShows[] = [
  { state: "NY", shows: 135, venues: 54 },
  { state: "CT", shows: 40, venues: 12 },
];

describe("VenueAtlas SVG baseline", () => {
  it("renders the US SVG with the shared viewBox and an img role", () => {
    const html = render(NY_HOT);
    expect(html).toContain('viewBox="0 0 959 593"');
    expect(html).toContain('role="img"');
  });

  it("links a played state to its lowercased ledger anchor", () => {
    const html = render(NY_HOT);
    expect(html).toContain('href="#g-ny"');
    expect(html).toContain('href="#g-ct"');
  });

  it("draws an unplayed state as an empty fill with no anchor", () => {
    const html = render(NY_HOT);
    // WY is present and drawn with the unplayed fill token…
    expect(html).toMatch(/<path[^>]*data-state="WY"[^>]*fill="var\(--surface-2\)"/);
    // …and, being unplayed, has nothing to link to.
    expect(html).not.toContain('href="#g-wy"');
  });
});

describe("VenueAtlas derives findings from props, never literals", () => {
  it("names the hottest state and its count in the aria-label", () => {
    const html = render(NY_HOT);
    expect(html).toContain("most in NY with 135");
  });

  it("flips the hottest state when the data flips — proving no hard-coding", () => {
    const ctHot: StateShows[] = [
      { state: "NY", shows: 30, venues: 54 },
      { state: "CT", shows: 200, venues: 12 },
    ];
    const html = render(ctHot);
    expect(html).toContain("most in CT with 200");
    expect(html).not.toContain("most in NY");
  });

  it("echoes the number of states played from props", () => {
    expect(render(NY_HOT)).toContain("2 states played");
    expect(render([...NY_HOT, { state: "CO", shows: 9, venues: 2 }])).toContain("3 states played");
  });
});

describe("VenueAtlas accessibility / no-JS text equivalent", () => {
  it("keeps the ranked /venues?q=XX list the static map has always had", () => {
    const html = render(NY_HOT);
    expect(html).toContain('href="/venues?q=NY"');
    expect(html).toContain('href="/venues?q=CT"');
  });

  it("renders no interactive controls in the SSR markup (mounted-gated)", () => {
    const html = render(NY_HOT);
    expect(html).not.toContain('aria-label="Zoom in"');
    expect(html).not.toContain("atlas-roster"); // panel absent until hydrated
    expect(html).not.toContain('class="atlas-live"');
  });

  it("preserves the international evidence with its counts", () => {
    const html = render(NY_HOT);
    expect(html).toContain("Beyond the US");
    expect(html).toContain("Mexico");
    expect(html).toContain("13");
    expect(html).toContain("venues");
  });
});

describe("buildRosters is authoritative and honest", () => {
  it("takes the state total from showsByState(), not a re-sum of venues", () => {
    // NY venue shows sum to 135 here by coincidence; make the authoritative total
    // disagree to prove the panel would cite the authoritative number.
    const states: StateShows[] = [{ state: "NY", shows: 999, venues: 2 }];
    const rosters = buildRosters(VENUES, states);
    expect(rosters.NY.shows).toBe(999); // from props, never Σ venue.shows (=135)
    expect(rosters.NY.venueCount).toBe(2);
  });

  it("sorts cities by summed shows desc and venues within a city by shows desc", () => {
    const rosters = buildRosters(VENUES, NY_HOT);
    // NY cities: Port Chester (90) then Queens (45).
    expect(rosters.NY.cities.map((c) => c.city)).toEqual(["Port Chester", "Queens"]);
    expect(rosters.NY.cities[0].venues[0].name).toBe("The Capitol Theatre");
  });

  it("excludes non-US venues from the rosters", () => {
    const intl = [...VENUES, mkVenue({ venueId: 9, name: "Massey Hall", city: "Toronto", state: "ON", country: "Canada", shows: 3 })];
    const rosters = buildRosters(intl, NY_HOT);
    expect(rosters.ON).toBeUndefined();
  });
});

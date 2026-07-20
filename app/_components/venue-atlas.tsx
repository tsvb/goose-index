import Link from "next/link";
import {
  normalizeCountry,
  type StateShows,
  type CountryShows,
  type VenueRow,
} from "@/lib/queries/dimensions";
import { VenueAtlasClient } from "./venue-atlas.client";

/**
 * The interactive edition of "where Goose plays".
 *
 * The static {@link VenueMap} answers "where" as a choropleth. This is the same
 * answer, made explorable: focus a state and the map zooms to it and unfolds the
 * rooms played there. Geography is real only at the level of states — the archive
 * carries city/state/country, never a lat/long — so the roster is listed by show
 * count, never arranged to imply a position within a state. The caption says so.
 *
 * This server component does no db work: page.tsx already fetched states,
 * countries, and venues. It reshapes the venue rows into per-state rosters and
 * hands everything to the client island, then server-renders the same
 * data-as-text the screen-reader/no-JS path has always had.
 */

export type AtlasVenue = { id: number; name: string; city: string | null; shows: number };
export type StateRoster = {
  state: string;
  shows: number;
  venueCount: number;
  cities: { city: string; venues: AtlasVenue[] }[];
};

/**
 * Group US venues into a roster per state.
 *
 * Pure and deterministic so it can run on the server with no surprises. The
 * per-state `shows` total is taken from showsByState() (the same source the map
 * tile is coloured from) — never re-summed here — so the panel can never disagree
 * with the tile it unfolds from.
 */
export function buildRosters(venues: VenueRow[], states: StateShows[]): Record<string, StateRoster> {
  const authoritative = new Map(states.map((s) => [s.state, s]));

  // code → (cityKey → venues). cityKey "" is the null-city bucket.
  const grouped = new Map<string, Map<string, AtlasVenue[]>>();

  for (const v of venues) {
    const c = v.country ? normalizeCountry(v.country) : "USA";
    if (c !== "USA") continue;
    const code = (v.state ?? "").toUpperCase().trim();
    if (!/^[A-Z]{2}$/.test(code)) continue;

    let cities = grouped.get(code);
    if (!cities) grouped.set(code, (cities = new Map()));
    const cityKey = v.city ?? "";
    let bucket = cities.get(cityKey);
    if (!bucket) cities.set(cityKey, (bucket = []));
    bucket.push({ id: v.venueId, name: v.name, city: v.city, shows: v.shows });
  }

  const codes = new Set<string>([...authoritative.keys(), ...grouped.keys()]);
  const out: Record<string, StateRoster> = {};

  for (const code of codes) {
    const cities = grouped.get(code) ?? new Map<string, AtlasVenue[]>();
    const uniqueVenues = new Set<number>();
    const cityList = [...cities.entries()]
      .map(([cityKey, list]) => {
        list.forEach((v) => uniqueVenues.add(v.id));
        const venuesSorted = [...list].sort(
          (a, b) => b.shows - a.shows || a.name.localeCompare(b.name),
        );
        return { city: cityKey, venues: venuesSorted };
      })
      .sort((a, b) => {
        const sa = a.venues.reduce((n, v) => n + v.shows, 0);
        const sb = b.venues.reduce((n, v) => n + v.shows, 0);
        return sb - sa || a.city.localeCompare(b.city);
      });

    out[code] = {
      state: code,
      shows: authoritative.get(code)?.shows ?? 0,
      venueCount: authoritative.get(code)?.venues ?? uniqueVenues.size,
      cities: cityList,
    };
  }

  return out;
}

export function VenueAtlas({
  states,
  countries,
  venues,
}: {
  states: StateShows[];
  countries: CountryShows[];
  venues: VenueRow[];
}) {
  const rosters = buildRosters(venues, states);
  const ranked = [...states].sort((a, b) => b.shows - a.shows);

  return (
    <>
      <VenueAtlasClient states={states} countries={countries} rosters={rosters} />

      {/* The map is decoration for a screen reader — this is the same data as
          text, server-rendered so it exists with or without hydration. Mirrors
          VenueMapTable and keeps the /venues?q=XX a11y contract. */}
      <ol className="atlas-sr-list mt-6 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
        {ranked.map((s) => (
          <li
            key={s.state}
            className="flex items-baseline justify-between gap-2 border-b border-line-soft py-1"
          >
            <Link href={`/venues?q=${s.state}`} className="font-mono text-xs text-muted hover:text-gold">
              {s.state}
            </Link>
            <span className="font-mono text-[0.68rem] tabular-nums text-faint">
              <span className="text-gold">{s.shows}</span> · {s.venues}v
            </span>
          </li>
        ))}
      </ol>

      {countries.length > 0 && (
        <div className="mt-8">
          <span className="eyebrow">Beyond the US</span>
          <ul className="mt-3 flex flex-wrap gap-2">
            {countries.map((c) => (
              <li
                key={c.country}
                className="flex items-baseline gap-2 rounded border border-line bg-surface/60 px-3 py-1.5"
              >
                <span className="font-display text-[0.9rem] text-ink">{c.country}</span>
                <span className="font-mono text-[0.65rem] tabular-nums text-gold">{c.shows}</span>
                <span className="font-mono text-[0.6rem] text-faint">
                  {c.shows === 1 ? "show" : "shows"} · {c.venues} {c.venues === 1 ? "venue" : "venues"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

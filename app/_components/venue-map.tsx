import Link from "next/link";
import { US_STATE_PATHS, US_VIEWBOX } from "@/lib/us-states";
import type { StateShows, CountryShows } from "@/lib/queries/dimensions";

/**
 * Where Goose plays, drawn as the thing it is.
 *
 * "Where" is a geographic question, and this page has been answering it with an
 * alphabetical index of state codes — you could not see that Connecticut is home
 * turf, or that the map thins out west of the Mississippi, without reading forty
 * rows and holding a map in your head.
 *
 * Shading is log-scaled: the range is 1–135 shows and it is brutally skewed
 * (Connecticut alone has more than the bottom thirty states combined), so a
 * linear ramp would paint the whole country the same faint wash and light up one
 * state. Colour means exactly one thing here — how many shows — and the states
 * with none are drawn, not omitted: an unplayed state is a fact, and leaving it
 * off the map would quietly turn absence into empty space.
 */
const MIN_OPACITY = 0.14;

export function VenueMap({ states, countries }: { states: StateShows[]; countries: CountryShows[] }) {
  const byState = new Map(states.map((s) => [s.state, s]));
  const most = Math.max(1, ...states.map((s) => s.shows));
  const hottest = states.reduce<StateShows | null>((a, b) => (!a || b.shows > a.shows ? b : a), null);

  // log, not linear: see the note above.
  const shade = (shows: number) =>
    MIN_OPACITY + (Math.log(shows) / Math.log(most)) * (1 - MIN_OPACITY);

  return (
    <figure className="m-0">
      <svg viewBox={US_VIEWBOX} className="w-full" role="img"
        aria-label={`Goose shows by US state. ${states.length} states played; most in ${hottest?.state ?? "—"} with ${hottest?.shows ?? 0}.`}>
        {Object.entries(US_STATE_PATHS).map(([code, d]) => {
          const hit = byState.get(code);
          const top = hit && hottest && code === hottest.state;
          return (
            <path
              key={code}
              d={d}
              fill={hit ? (top ? "var(--ember)" : "var(--gold)") : "var(--surface-2)"}
              fillOpacity={hit ? shade(hit.shows) : 1}
              stroke="var(--bg)"
              strokeWidth={0.9}
            >
              <title>
                {hit
                  ? `${code} — ${hit.shows} ${hit.shows === 1 ? "show" : "shows"} at ${hit.venues} ${hit.venues === 1 ? "venue" : "venues"}`
                  : `${code} — never played`}
              </title>
            </path>
          );
        })}
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 font-mono text-[0.62rem] text-faint">
        <span className="flex items-center gap-2">
          Fewer shows
          <span aria-hidden className="flex h-2.5">
            {[0.14, 0.3, 0.5, 0.72, 1].map((o) => (
              <span key={o} className="h-2.5 w-6" style={{ background: "var(--gold)", opacity: o }} />
            ))}
          </span>
          More
          <span aria-hidden className="ml-2 h-2.5 w-6" style={{ background: "var(--ember)" }} />
          <span className="text-muted">{hottest?.state}</span>
        </span>
        <span>
          Shaded on a log scale — {hottest?.state} alone has {hottest?.shows} shows, and a linear ramp would wash out
          everywhere else. States never played are drawn empty, not left off.
        </span>
      </figcaption>

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
    </figure>
  );
}

/** The map is decoration for a screen reader — this is the same data as text. */
export function VenueMapTable({ states }: { states: StateShows[] }) {
  const ranked = [...states].sort((a, b) => b.shows - a.shows);
  return (
    <ol className="mt-6 grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3 lg:grid-cols-4">
      {ranked.map((s) => (
        <li key={s.state} className="flex items-baseline justify-between gap-2 border-b border-line-soft py-1">
          <Link href={`/venues?q=${s.state}`} className="font-mono text-xs text-muted hover:text-gold">
            {s.state}
          </Link>
          <span className="font-mono text-[0.68rem] tabular-nums text-faint">
            <span className="text-gold">{s.shows}</span> · {s.venues}v
          </span>
        </li>
      ))}
    </ol>
  );
}

import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { SectionHeader } from "@/app/_components/section-header";
import { ShowRow } from "@/app/_components/show-card";
import { SearchBox } from "@/app/_components/search-box";
import { ArrowRight, Calendar, Disc, MapPin } from "@/app/_components/marks";
import { searchShows, type ShowSummary } from "@/lib/queries/shows";
import { searchSongs, type SongSearchRow } from "@/lib/queries/songs";
import { searchVenues, searchTours, listYears, type VenueRow, type TourRow } from "@/lib/queries/dimensions";
import { locationLine, formatShortDate, songHref } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { Doc, Breadcrumb, ShowTable, EntityTable, DocSection } from "@/app/_components/doc";
import { canonicalUrl } from "@/lib/site";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search: ${q}` : "Search",
    description: q
      ? `Goose Index search results for "${q}".`
      : "Search the Goose Index by song, date, venue, city, or tour.",
    alternates: { canonical: canonicalUrl("/search") },
  };
}

const SONG_LIMIT = 12;

type SearchResults = {
  songs: SongSearchRow[];
  songsTotal: number;
  shows: ShowSummary[];
  showsTotal: number;
  venues: VenueRow[];
  venuesTotal: number;
  tours: TourRow[];
  toursTotal: number;
  /** Set when the query is a bare 4-digit year Goose actually played. */
  year: number | null;
};

async function runSearch(term: string): Promise<SearchResults> {
  const isYearQuery = /^\d{4}$/.test(term);
  const [songs, shows, venues, tours, years] = await Promise.all([
    searchSongs(term, SONG_LIMIT),
    searchShows(term, 24),
    searchVenues(term, 12),
    searchTours(term, 8),
    isYearQuery ? listYears() : Promise.resolve([]),
  ]);
  return {
    songs: songs.rows,
    songsTotal: songs.total,
    shows: shows.rows,
    showsTotal: shows.total,
    venues: venues.rows,
    venuesTotal: venues.total,
    tours: tours.rows,
    toursTotal: tours.total,
    year: isYearQuery && years.some((y) => y.year === Number(term)) ? Number(term) : null,
  };
}

const songCatalogHref = (term: string) => `/songs?q=${encodeURIComponent(term)}`;

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams;
  const term = q?.trim() ?? "";

  const experience = await getExperience();
  if (experience === "minimal") {
    if (!term) {
      return (
        <Container className="py-8">
          <Doc>
            <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Search" }]} />
            <h1>Search</h1>
            <MinimalSearchForm q="" />
            <p>Search by song, date (2022-06-24), venue, city, or tour. Or query straight from the address bar, e.g. <code>/search?q=red+rocks</code>.</p>
          </Doc>
        </Container>
      );
    }
    const r = await runSearch(term);
    const empty = r.songs.length === 0 && r.shows.length === 0 && r.venues.length === 0 && r.tours.length === 0;
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Search" }]} />
          <h1>Search: {term}</h1>
          <MinimalSearchForm q={term} />
          {r.songs.length > 0 && (
            <DocSection title={`Songs · ${r.songsTotal}`}>
              {r.songsTotal > r.songs.length && <p>Showing the {r.songs.length} most played of {r.songsTotal}.</p>}
              <EntityTable rows={r.songs.map((s) => ({
                href: songHref(s),
                name: s.name,
                sub: s.lastPlayedDate ? `last played ${s.lastPlayedDate}` : "never played",
                count: s.timesPlayed,
              }))} />
              {r.songsTotal > r.songs.length && <p><Link href={songCatalogHref(term)}>See all matching songs →</Link></p>}
            </DocSection>
          )}
          {r.year != null && <p><Link href={`/years/${r.year}`}>Year {r.year} →</Link></p>}
          {r.shows.length > 0 && (
            <DocSection title={`Shows · ${r.showsTotal}`}>
              {r.showsTotal > r.shows.length && <p>Showing the {r.shows.length} most recent of {r.showsTotal}.</p>}
              <ShowTable shows={r.shows} />
            </DocSection>
          )}
          {r.venues.length > 0 && (
            <DocSection title={`Venues · ${r.venuesTotal}`}>
              {r.venuesTotal > r.venues.length && <p>Showing {r.venues.length} of {r.venuesTotal}.</p>}
              <EntityTable rows={r.venues.map((v) => ({ href: `/venues/${v.venueId}`, name: v.name, sub: locationLine(v.city, v.state, v.country), count: v.shows }))} />
            </DocSection>
          )}
          {r.tours.length > 0 && (
            <DocSection title={`Tours · ${r.toursTotal}`}>
              {r.toursTotal > r.tours.length && <p>Showing {r.tours.length} of {r.toursTotal}.</p>}
              <EntityTable rows={r.tours.map((t) => ({ href: `/tours/${t.tourId}`, name: t.name, count: t.shows }))} />
            </DocSection>
          )}
          {empty && (
            <>
              <p>No results for &ldquo;{term}&rdquo;. Try a song name, a date like <code>2022-06-24</code>, a venue, or a city.</p>
              <p><Link href={songCatalogHref(term)}>Search the song catalog for &ldquo;{term}&rdquo; →</Link></p>
              <p>Or browse <Link href="/shows">all shows</Link> · <Link href="/songs">all songs</Link>.</p>
            </>
          )}
        </Doc>
      </Container>
    );
  }

  if (!term) {
    return (
      <div className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-16 sm:py-24">
          <span className="eyebrow">Search the index</span>
          <h1 className="mt-4 font-display text-[2.4rem] leading-[1.06] tracking-tight text-ink sm:text-5xl">
            Every show. Every night.
            <br />
            <span className="italic text-gold">Find yours.</span>
          </h1>
          <p className="mt-4 max-w-md text-muted">
            Search by song (Hot Tea), date (2022-06-24), venue, city, or tour.
          </p>
          <div className="mt-8 max-w-xl">
            <SearchBox size="full" />
          </div>
        </Container>
      </div>
    );
  }

  const r = await runSearch(term);
  const total = r.songs.length + r.shows.length + r.venues.length + r.tours.length;

  return (
    <>
      {/* Header */}
      <div className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-12 sm:py-16">
          <span className="eyebrow">Search the index</span>
          <h1 className="mt-3 font-display text-[2rem] leading-tight tracking-tight text-ink sm:text-4xl">
            Results for{" "}
            <span className="italic text-gold">&ldquo;{term}&rdquo;</span>
          </h1>
          <div className="mt-6 max-w-xl">
            <SearchBox size="full" />
          </div>
        </Container>
      </div>

      <Container className="py-12">
        {/* Empty state */}
        {total === 0 && (
          <div className="py-16 text-center">
            <p className="font-display text-2xl text-ink">
              No results for &ldquo;{term}&rdquo;
            </p>
            <p className="mt-3 text-muted">
              Try a song like{" "}
              <span className="font-mono text-gold-soft">Hot Tea</span>, a date
              like <span className="font-mono text-gold-soft">2022-06-24</span>,
              a venue name, or a city.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3">
              <Link
                href={songCatalogHref(term)}
                className="group inline-flex items-center gap-1.5 font-mono text-xs text-sage transition hover:text-ink"
              >
                Search the song catalog for &ldquo;{term}&rdquo;
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </Link>
              <p className="font-mono text-xs text-faint">
                or browse{" "}
                <Link href="/shows" className="text-sage transition hover:text-ink">
                  all shows
                </Link>{" "}
                ·{" "}
                <Link href="/songs" className="text-sage transition hover:text-ink">
                  the song catalog
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* Songs — the #1 lookup on a setlist site, so they lead. */}
        {r.songs.length > 0 && (
          <section className="mb-12">
            <SectionHeader
              eyebrow="From the catalog"
              title={`Songs · ${r.songsTotal}`}
              href={r.songsTotal > r.songs.length ? songCatalogHref(term) : undefined}
              linkLabel="See all"
            />
            <ul className="surface-card divide-y divide-line-soft">
              {r.songs.map((s) => (
                <li key={s.songId}>
                  <Link
                    href={songHref(s)}
                    className="group flex items-center gap-4 px-4 py-4 transition hover:bg-surface-2"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-faint transition group-hover:border-gold group-hover:text-gold">
                      <Disc className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-base text-ink transition group-hover:text-gold">
                        {s.name}
                      </div>
                      <div className="truncate text-sm text-muted">
                        {s.lastPlayedDate
                          ? `Last played ${formatShortDate(s.lastPlayedDate)}`
                          : "Not yet played live"}
                      </div>
                    </div>
                    <span className="font-mono text-[0.7rem] text-faint">
                      {s.timesPlayed} {s.timesPlayed === 1 ? "play" : "plays"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Year shortcut — a bare year query almost always means "show me that year". */}
        {r.year != null && (
          <Link
            href={`/years/${r.year}`}
            className="group mb-8 flex items-center gap-4 rounded-lg border border-gold/40 bg-surface px-5 py-4 transition hover:-translate-y-0.5 hover:border-gold hover:bg-surface-2"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-gold transition group-hover:border-gold">
              <Calendar className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <div className="font-display text-lg text-ink transition group-hover:text-gold">
                Year {r.year}
              </div>
              <div className="text-sm text-muted">Every show from {r.year}, in one place</div>
            </div>
            <ArrowRight className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-gold" />
          </Link>
        )}

        {/* Shows */}
        {r.shows.length > 0 && (
          <section className="mb-12">
            <SectionHeader eyebrow="Matching nights" title={`Shows · ${r.showsTotal}`} />
            <div className="surface-card divide-y divide-line-soft">
              {r.shows.map((show) => (
                <ShowRow key={show.showId} show={show} />
              ))}
            </div>
            {r.showsTotal > r.shows.length && (
              <p className="mt-3 font-mono text-[0.7rem] text-faint">
                Showing the {r.shows.length} most recent of {r.showsTotal} matching shows
              </p>
            )}
          </section>
        )}

        {/* Venues */}
        {r.venues.length > 0 && (
          <section className="mb-12">
            <SectionHeader eyebrow="Places" title={`Venues · ${r.venuesTotal}`} />
            <ul className="surface-card divide-y divide-line-soft">
              {r.venues.map((v) => {
                const loc = locationLine(v.city, v.state, v.country);
                return (
                  <li key={v.venueId}>
                    <Link
                      href={`/venues/${v.venueId}`}
                      className="group flex items-center gap-4 px-4 py-4 transition hover:bg-surface-2"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-faint transition group-hover:border-gold group-hover:text-gold">
                        <MapPin className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-base text-ink transition group-hover:text-gold">
                          {v.name}
                        </div>
                        {loc && (
                          <div className="truncate text-sm text-muted">{loc}</div>
                        )}
                      </div>
                      <span className="font-mono text-[0.7rem] text-faint">
                        {v.shows} {v.shows === 1 ? "show" : "shows"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {r.venuesTotal > r.venues.length && (
              <p className="mt-3 font-mono text-[0.7rem] text-faint">
                Showing {r.venues.length} of {r.venuesTotal} matching venues
              </p>
            )}
          </section>
        )}

        {/* Tours */}
        {r.tours.length > 0 && (
          <section className="mb-12">
            <SectionHeader eyebrow="Runs & eras" title={`Tours · ${r.toursTotal}`} />
            <ul className="surface-card divide-y divide-line-soft">
              {r.tours.map((t) => {
                const dateRange =
                  t.start && t.end
                    ? `${formatShortDate(t.start)} – ${formatShortDate(t.end)}`
                    : t.start
                    ? `From ${formatShortDate(t.start)}`
                    : null;
                return (
                  <li key={t.tourId}>
                    <Link
                      href={`/tours/${t.tourId}`}
                      className="group flex items-center gap-4 px-4 py-4 transition hover:bg-surface-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-display text-base text-ink transition group-hover:text-gold">
                          {t.name}
                        </div>
                        {dateRange && (
                          <div className="font-mono text-[0.7rem] text-faint">
                            {dateRange}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-[0.7rem] text-faint">
                        {t.shows} {t.shows === 1 ? "show" : "shows"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {r.toursTotal > r.tours.length && (
              <p className="mt-3 font-mono text-[0.7rem] text-faint">
                Showing {r.tours.length} of {r.toursTotal} matching tours
              </p>
            )}
          </section>
        )}
      </Container>
    </>
  );
}

// Minimal mode gets a real form — telling people to edit the address bar is
// a tip, not an input method.
function MinimalSearchForm({ q }: { q: string }) {
  return (
    <form action="/search" method="get">
      <label>
        Search: <input name="q" defaultValue={q} />
      </label>{" "}
      <button type="submit">Go</button>
    </form>
  );
}

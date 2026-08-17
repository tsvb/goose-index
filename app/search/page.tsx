import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { SearchBox } from "@/app/_components/search-box";
import { PageHead, NilState, chromeLink, chromeDate } from "@/app/_components/page-chrome";
import { SectionRule, Ledger, LedgerEntry } from "@/app/_components/forms";
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
      <Container>
        <PageHead
          kicker="search the index"
          title={
            <>
              every show. every night.
              <br />
              <span className="text-steel">find yours.</span>
            </>
          }
        >
          <p className="mt-4 max-w-md text-muted">
            Search by song (Hot Tea), date (2022-06-24), venue, city, or tour.
          </p>
          <div className="mt-8 max-w-xl">
            <SearchBox size="full" />
          </div>
        </PageHead>
      </Container>
    );
  }

  const r = await runSearch(term);
  const total = r.songs.length + r.shows.length + r.venues.length + r.tours.length;

  return (
    <Container>
      <PageHead
        kicker="search the index"
        title={
          <>
            results for <span className="text-steel">&ldquo;{term}&rdquo;</span>
          </>
        }
      >
        <div className="mt-6 max-w-xl">
          <SearchBox size="full" />
        </div>
      </PageHead>

      {/* Empty state */}
      {total === 0 && (
        <NilState href={songCatalogHref(term)} linkLabel={`search the song catalog for “${term}”`}>
          No results for &ldquo;{term}&rdquo;. Try a song like{" "}
          <span className="font-mono text-steel">Hot Tea</span>, a date like{" "}
          <span className="font-mono text-steel">2022-06-24</span>, a venue name, or a city. Or browse{" "}
          <Link href="/shows" className={chromeLink}>all shows</Link>
          {" · "}
          <Link href="/songs" className={chromeLink}>the song catalog</Link>.
        </NilState>
      )}

      {/* Songs — the #1 lookup on a setlist site, so they lead. */}
      {r.songs.length > 0 && (
        <section className="mb-12">
          <SectionRule
            title={`songs · ${r.songsTotal}`}
            href={r.songsTotal > r.songs.length ? songCatalogHref(term) : undefined}
            seed="search-songs"
          />
          <Ledger seed="search-songs">
            {r.songs.map((s) => (
              <Link
                key={s.songId}
                href={songHref(s)}
                className="group flex items-center justify-between gap-4 py-2.5"
              >
                <span className="min-w-0 flex-1 truncate text-ink underline-offset-4 group-hover:underline">
                  {s.name}
                </span>
                <span className="shrink-0 text-right text-[0.8rem] text-muted">
                  {s.lastPlayedDate ? `last played ${formatShortDate(s.lastPlayedDate)}` : "not yet played live"}
                </span>
                <span className="shrink-0 text-right font-mono text-[0.7rem] text-faint">
                  {s.timesPlayed} {s.timesPlayed === 1 ? "play" : "plays"}
                </span>
              </Link>
            ))}
          </Ledger>
        </section>
      )}

      {/* Year shortcut — a bare year query almost always means "show me that year". */}
      {r.year != null && (
        <Link href={`/years/${r.year}`} className="group mb-8 flex items-baseline justify-between gap-4 py-2">
          <span className="font-mono text-[0.95rem] text-steel">year {r.year}</span>
          <span className="text-[0.8rem] lowercase text-spruce underline underline-offset-4 transition group-hover:text-ink">
            every show from {r.year} →
          </span>
        </Link>
      )}

      {/* Shows */}
      {r.shows.length > 0 && (
        <section className="mb-12">
          <SectionRule title={`shows · ${r.showsTotal}`} seed="search-shows" />
          <Ledger seed="search-shows">
            {r.shows.map((show) => (
              <LedgerEntry key={show.showId} show={show} />
            ))}
          </Ledger>
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
          <SectionRule title={`venues · ${r.venuesTotal}`} seed="search-venues" />
          <Ledger seed="search-venues">
            {r.venues.map((v) => {
              const loc = locationLine(v.city, v.state, v.country);
              return (
                <Link
                  key={v.venueId}
                  href={`/venues/${v.venueId}`}
                  className="group flex items-center justify-between gap-4 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-ink underline-offset-4 group-hover:underline">
                      {v.name}
                    </span>
                    {loc && <span className="ml-2 truncate text-[0.8rem] text-muted">{loc}</span>}
                  </span>
                  <span className="shrink-0 text-right font-mono text-[0.7rem] text-faint">
                    {v.shows} {v.shows === 1 ? "show" : "shows"}
                  </span>
                </Link>
              );
            })}
          </Ledger>
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
          <SectionRule title={`tours · ${r.toursTotal}`} seed="search-tours" />
          <Ledger seed="search-tours">
            {r.tours.map((t) => {
              const dateRange =
                t.start && t.end
                  ? `${chromeDate(t.start)} – ${chromeDate(t.end)}`
                  : t.start
                  ? `from ${chromeDate(t.start)}`
                  : null;
              return (
                <Link
                  key={t.tourId}
                  href={`/tours/${t.tourId}`}
                  className="group flex items-center justify-between gap-4 py-2.5"
                >
                  <span className="min-w-0 flex-1 truncate">
                    <span className="text-ink underline-offset-4 group-hover:underline">
                      {t.name}
                    </span>
                    {dateRange && <span className="ml-2 font-mono text-[0.7rem] text-faint">{dateRange}</span>}
                  </span>
                  <span className="shrink-0 text-right font-mono text-[0.7rem] text-faint">
                    {t.shows} {t.shows === 1 ? "show" : "shows"}
                  </span>
                </Link>
              );
            })}
          </Ledger>
          {r.toursTotal > r.tours.length && (
            <p className="mt-3 font-mono text-[0.7rem] text-faint">
              Showing {r.tours.length} of {r.toursTotal} matching tours
            </p>
          )}
        </section>
      )}
    </Container>
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

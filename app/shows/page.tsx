import Link from "next/link";
import type { Metadata } from "next";
import { AnchorFlash } from "@/app/_components/anchor-flash";
import { Container } from "@/app/_components/container";
import { PageHead, FilterLink, FilterRow, FolioNav, NilState } from "@/app/_components/page-chrome";
import { Ledger, LedgerEntry } from "@/app/_components/forms";
import { PenRule } from "@/app/_components/pen";
import { listShows, findLatestPastShow } from "@/lib/queries/shows";
import { listYears, listTours } from "@/lib/queries/dimensions";
import { compact } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { Doc, Breadcrumb, ShowTable } from "@/app/_components/doc";
import {
  buildShowsHref,
  resolveDir,
  resolvePer,
  SHOWS_PER_OPTIONS,
  type ShowsQuery,
} from "@/lib/shows-url";
import { canonicalUrl } from "@/lib/site";

type SearchParams = Promise<{ year?: string; tour?: string; dir?: string; per?: string; page?: string }>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : undefined;
  return {
    title: year ? `Shows in ${year}` : "Shows",
    alternates: { canonical: canonicalUrl("/shows") },
  };
}

/** Chrome links (companion/jump) — spruce, not a filter state. */
const spruceLinkClass =
  "font-mono text-xs lowercase text-spruce underline underline-offset-4 transition hover:text-ink";

export default async function ShowsBrowsePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : undefined;
  const tourId = sp.tour ? parseInt(sp.tour, 10) : undefined;
  const dir = resolveDir(sp.dir);
  const per = resolvePer(sp.per);
  const page = Math.max(1, sp.page ? parseInt(sp.page, 10) : 1);

  const current: ShowsQuery = { year, tourId, dir, per, page };
  const href = (overrides: Parameters<typeof buildShowsHref>[1]) => buildShowsHref(current, overrides);

  const [{ rows, total }, years, allTours, latest] = await Promise.all([
    listShows({ year, tourId, dir, page, perPage: per }),
    listYears(),
    listTours(),
    findLatestPastShow({ year, tourId, dir, perPage: per }),
  ]);

  const tourOptions = year ? allTours.filter((t) => t.year === year) : [];
  const selectedTour = tourId ? allTours.find((t) => t.tourId === tourId) : undefined;
  const totalPages = Math.max(1, Math.ceil(total / per));
  const experience = await getExperience();

  const flipDir = dir === "asc" ? "desc" : "asc";
  // The toggle reads as the action it performs; countLine states the current order.
  const flipDirLabel = dir === "asc" ? "Show newest first" : "Show oldest first";

  const scope = selectedTour ? selectedTour.name : year ? `in ${year}` : null;
  // Unfiltered, the total counts every show in the log — announced future
  // dates included — unlike the home hero's "shows played". Say so.
  const countLine = scope
    ? `${compact(total)} ${total === 1 ? "show" : "shows"} · ${scope}`
    : `${compact(total)} ${total === 1 ? "show" : "shows"} logged · incl. upcoming · ${dir === "asc" ? "oldest first" : "newest first"}`;

  const jumpLabel = latest?.isToday ? "tonight’s show" : "most recent show";
  const jumpHref = latest ? `${href({ page: latest.page })}#show-${latest.showId}` : null;

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <AnchorFlash />
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Shows" }]} />
          <h1>{selectedTour ? selectedTour.name : year ? `Shows in ${year}` : "All shows"}</h1>
          <p className="doc-crumb">{countLine}</p>
          <p className="doc-crumb">
            Years: <Link href={href({ year: null })}>All</Link>
            {years.map((y) => (<span key={y.year}> · <Link href={href({ year: y.year })}>{y.year}</Link></span>))}
            {year ? <span> · <Link href={`/years/${year}`}>Year {year} page →</Link></span> : null}
          </p>
          {tourOptions.length > 0 && (
            <p className="doc-crumb">
              Tours: <Link href={href({ tourId: null })}>All {year}</Link>
              {tourOptions.map((t) => (<span key={t.tourId}> · <Link href={href({ tourId: t.tourId })}>{t.name}</Link></span>))}
            </p>
          )}
          <p className="doc-crumb">
            Per page: {SHOWS_PER_OPTIONS.map((n, i) => (
              <span key={n}>{i > 0 ? " · " : ""}<Link href={href({ per: n })}>{n}</Link></span>
            ))}
            {" · "}Sort: <Link href={href({ dir: flipDir })}>{flipDirLabel}</Link>
            {jumpHref ? <> {" · "}<Link href={jumpHref}>{jumpLabel}</Link></> : null}
          </p>
          <ShowTable shows={rows} />
          {totalPages > 1 && (
            <p className="doc-crumb">
              {page > 1 ? <Link href={href({ page: page - 1 })}>← Previous</Link> : null}
              {" "}Page {page} of {totalPages}{" "}
              {page < totalPages ? <Link href={href({ page: page + 1 })}>Next →</Link> : null}
            </p>
          )}
        </Doc>
      </Container>
    );
  }

  return (
    <>
      <AnchorFlash />
      <Container>
        <PageHead kicker="goose index · shows" title="every show" meta={countLine} />

        <div className="flex flex-col gap-3">
          {/* Year filter */}
          <FilterRow>
            <FilterLink href={href({ year: null })} active={!year}>All</FilterLink>
            {years.map((y) => (
              <FilterLink key={y.year} href={href({ year: y.year })} active={year === y.year}>
                {y.year}
              </FilterLink>
            ))}
            {year != null && (
              <Link href={`/years/${year}`} className={spruceLinkClass}>
                {`year ${year} page`}
              </Link>
            )}
          </FilterRow>

          {/* Contextual tour filter — appears once a year is chosen */}
          {tourOptions.length > 0 && (
            <FilterRow label="tours">
              <FilterLink href={href({ tourId: null })} active={!tourId}>All {year}</FilterLink>
              {tourOptions.map((t) => (
                <FilterLink key={t.tourId} href={href({ tourId: t.tourId })} active={tourId === t.tourId} preserveCase>
                  {t.name}
                </FilterLink>
              ))}
            </FilterRow>
          )}

          {/* Per-page + sort + jump-to-recent */}
          <FilterRow label="per page">
            {SHOWS_PER_OPTIONS.map((n) => (
              <FilterLink key={n} href={href({ per: n })} active={per === n}>
                {n}
              </FilterLink>
            ))}
            <FilterLink href={href({ dir: flipDir })} active={false}>
              {flipDirLabel.toLowerCase()}
            </FilterLink>
            {jumpHref && (
              <Link href={jumpHref} className={spruceLinkClass}>
                {jumpLabel} →
              </Link>
            )}
          </FilterRow>
        </div>

        <PenRule seed="shows-filters" className="mt-6" />

        {/* Show list */}
        <div className="mt-6">
          {rows.length === 0 ? (
            <NilState href="/shows" linkLabel="clear filters">No shows found.</NilState>
          ) : (
            <Ledger seed="shows">
              {rows.map((s) => (
                <div key={s.showId} id={`show-${s.showId}`} className="show-anchor">
                  <LedgerEntry show={s} />
                </div>
              ))}
            </Ledger>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 pb-4">
            <FolioNav
              prevHref={page > 1 ? href({ page: page - 1 }) : undefined}
              nextHref={page < totalPages ? href({ page: page + 1 }) : undefined}
              center={`page ${compact(page)} of ${compact(totalPages)}`}
            />
          </div>
        )}
      </Container>
    </>
  );
}

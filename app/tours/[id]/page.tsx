import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, MetaTable, DocSection, ShowTable } from "@/app/_components/doc";
import { NilState, chromeLink, chromeDate } from "@/app/_components/page-chrome";
import { Ledger, LedgerEntry } from "@/app/_components/forms";
import { getTourMeta } from "@/lib/queries/dimensions";
import { listShows } from "@/lib/queries/shows";
import { formatShortDate } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { entityMetadata } from "@/lib/site";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params, parent: ResolvingMetadata): Promise<Metadata> {
  const { id } = await params;
  const tourId = parseInt(id, 10);
  if (isNaN(tourId)) return { title: "Tour not found" };
  const tour = await getTourMeta(tourId);
  if (!tour) return { title: "Tour not found" };
  const description = `All ${tour.shows} Goose show${tour.shows === 1 ? "" : "s"} on ${tour.name}, with full setlists.`;
  return { title: tour.name, description, ...entityMetadata({ title: tour.name, description, path: `/tours/${tourId}`, parent: await parent }) };
}

export default async function TourPage({ params }: Params) {
  const { id } = await params;
  const tourId = parseInt(id, 10);
  if (isNaN(tourId)) notFound();

  const [tour, { rows: shows }] = await Promise.all([
    getTourMeta(tourId),
    listShows({ tourId, perPage: 400, dir: "asc" }),
  ]);

  if (!tour) notFound();

  const experience = await getExperience();

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/tours", label: "Tours" }, { label: tour.name }]} />
          <h1>{tour.name}</h1>
          <MetaTable rows={[
            { k: "Year", v: tour.year },
            ...(tour.start && tour.end ? [{ k: "Dates", v: `${formatShortDate(tour.start)} – ${formatShortDate(tour.end)}` }] : []),
            { k: "Shows", v: tour.shows },
          ]} />
          <DocSection title="Shows"><ShowTable shows={shows} /></DocSection>
        </Doc>
      </Container>
    );
  }

  const dateRange =
    tour.start && tour.end
      ? `${chromeDate(tour.start)} – ${chromeDate(tour.end)}`
      : tour.start
      ? `from ${chromeDate(tour.start)}`
      : null;

  return (
    <article>
      {/* PageHead-style markup, written inline: the kicker carries a real
          tours link (PageHead's own kicker is plain text only). */}
      <header className="border-b border-line">
        <Container className="py-10 sm:py-14">
          <p className="text-[0.7rem] lowercase text-faint">
            <Link href="/tours" className={chromeLink}>
              tours
            </Link>
          </p>
          <h1 className="mt-1 text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {tour.name}
          </h1>
          <p className="mt-2 font-mono text-[0.75rem] text-faint">
            {tour.shows} {tour.shows === 1 ? "show" : "shows"}
            {dateRange && (
              <>
                {" · "}
                {dateRange}
              </>
            )}
          </p>
        </Container>
      </header>

      {/* Show list */}
      <Container className="py-10 sm:py-14">
        {shows.length === 0 ? (
          <NilState>No shows found for this tour.</NilState>
        ) : (
          <Ledger seed={`tour-${tourId}`}>
            {shows.map((show) => (
              <LedgerEntry key={show.showId} show={show} context="tour" />
            ))}
          </Ledger>
        )}
      </Container>
    </article>
  );
}

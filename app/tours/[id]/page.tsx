import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { ShowRow } from "@/app/_components/show-card";
import { Doc, Breadcrumb, MetaTable, DocSection, ShowTable } from "@/app/_components/doc";
import { getTourMeta } from "@/lib/queries/dimensions";
import { listShows } from "@/lib/queries/shows";
import { formatShortDate } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const tourId = parseInt(id, 10);
  if (isNaN(tourId)) return { title: "Tour not found" };
  const tour = await getTourMeta(tourId);
  if (!tour) return { title: "Tour not found" };
  return { title: tour.name };
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
      ? `${formatShortDate(tour.start)} – ${formatShortDate(tour.end)}`
      : tour.start
      ? `From ${formatShortDate(tour.start)}`
      : null;

  return (
    <article>
      {/* Hero header */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-12 sm:py-16">
          <span className="eyebrow rise" style={{ animationDelay: "0ms" }}>
            Tour
          </span>
          <h1
            className="rise mt-3 font-display text-[2.4rem] leading-none tracking-tight text-ink sm:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            {tour.name}
          </h1>
          <p
            className="rise mt-4 font-mono text-xs text-faint"
            style={{ animationDelay: "120ms" }}
          >
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
          <p className="font-mono text-sm text-faint">No shows found for this tour.</p>
        ) : (
          <div className="surface-card overflow-hidden px-2">
            {shows.map((show) => (
              <ShowRow key={show.showId} show={show} />
            ))}
          </div>
        )}
      </Container>
    </article>
  );
}

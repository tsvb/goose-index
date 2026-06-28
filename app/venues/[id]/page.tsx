import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { ShowRow } from "@/app/_components/show-card";
import { MapPin } from "@/app/_components/marks";
import { Doc, Breadcrumb, MetaTable, DocSection, ShowTable } from "@/app/_components/doc";
import { getVenueMeta } from "@/lib/queries/dimensions";
import { listShows } from "@/lib/queries/shows";
import { locationLine, compact, formatShortDate } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const venueId = parseInt(id, 10);
  const venue = Number.isNaN(venueId) ? null : await getVenueMeta(venueId);
  if (!venue) return { title: "Venue not found" };
  return {
    title: venue.name,
    description: `All Goose shows at ${venue.name}${venue.city ? `, ${venue.city}` : ""}.`,
  };
}

export default async function VenuePage({ params }: Params) {
  const { id } = await params;
  const venueId = parseInt(id, 10);
  if (Number.isNaN(venueId)) notFound();

  const [venue, showsResult] = await Promise.all([
    getVenueMeta(venueId),
    listShows({ venueId, perPage: 400, dir: "desc" }),
  ]);

  if (!venue) notFound();

  const experience = await getExperience();
  const { rows: shows } = showsResult;
  const loc = locationLine(venue.city, venue.state, venue.country);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Almanac" }, { href: "/venues", label: "Venues" }, { label: venue.name }]} />
          <h1>{venue.name}</h1>
          <MetaTable rows={[
            { k: "Location", v: locationLine(venue.city, venue.state, venue.country) || "—" },
            ...(venue.capacity && venue.capacity > 0 ? [{ k: "Capacity", v: compact(venue.capacity) }] : []),
            { k: "Shows", v: venue.shows },
            ...(venue.first ? [{ k: "First", v: venue.first }] : []),
            ...(venue.last ? [{ k: "Last", v: venue.last }] : []),
          ]} />
          <DocSection title="Shows here"><ShowTable shows={shows} /></DocSection>
        </Doc>
      </Container>
    );
  }

  // Build stat line parts
  const statParts: string[] = [
    `${compact(venue.shows)} ${venue.shows === 1 ? "show" : "shows"}`,
  ];
  if (venue.capacity != null && venue.capacity > 0) {
    statParts.push(`cap. ${compact(venue.capacity)}`);
  }
  if (venue.first) {
    statParts.push(`first ${formatShortDate(venue.first)}`);
  }
  if (venue.last) {
    statParts.push(`last ${formatShortDate(venue.last)}`);
  }

  return (
    <article>
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-12 sm:py-16">
          <span className="eyebrow rise" style={{ animationDelay: "0ms" }}>
            Venue
          </span>
          <h1
            className="rise mt-4 font-display text-[2.6rem] leading-none tracking-tight text-ink sm:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            {venue.name}
          </h1>
          {loc && (
            <p
              className="rise mt-3 flex items-center gap-1.5 text-muted"
              style={{ animationDelay: "120ms" }}
            >
              <MapPin className="h-4 w-4 text-faint" />
              {loc}
            </p>
          )}
          <p
            className="rise mt-4 font-mono text-xs text-faint"
            style={{ animationDelay: "180ms" }}
          >
            {statParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1.5 text-line">·</span>}
                {part}
              </span>
            ))}
          </p>
        </Container>
      </header>

      {/* Shows list */}
      <Container className="py-10">
        {shows.length === 0 ? (
          <p className="font-mono text-sm text-faint">No shows logged yet.</p>
        ) : (
          <div>
            <p className="mb-4 font-mono text-xs text-faint">
              {shows.length} {shows.length === 1 ? "show" : "shows"} — newest first
            </p>
            <div className="surface-card overflow-hidden px-2">
              {shows.map((show) => (
                <ShowRow key={show.showId} show={show} />
              ))}
            </div>
          </div>
        )}
      </Container>
    </article>
  );
}

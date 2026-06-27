import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { ShowRow } from "@/app/_components/show-card";
import { MapPin } from "@/app/_components/marks";
import { getVenueMeta } from "@/lib/queries/dimensions";
import { listShows } from "@/lib/queries/shows";
import { locationLine, compact, formatShortDate } from "@/lib/queries/format";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const venue = await getVenueMeta(parseInt(id, 10));
  if (!venue) return { title: "Venue not found" };
  return {
    title: venue.name,
    description: `All Goose shows at ${venue.name}${venue.city ? `, ${venue.city}` : ""}.`,
  };
}

export default async function VenuePage({ params }: Params) {
  const { id } = await params;
  const venueId = parseInt(id, 10);

  const [venue, showsResult] = await Promise.all([
    getVenueMeta(venueId),
    listShows({ venueId, perPage: 400, dir: "desc" }),
  ]);

  if (!venue) notFound();

  const { rows: shows } = showsResult;
  const loc = locationLine(venue.city, venue.state, venue.country);

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

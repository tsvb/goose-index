import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { Container } from "@/app/_components/container";
import { MapPin } from "@/app/_components/marks";
import { Doc, Breadcrumb, MetaTable, DocSection, ShowTable } from "@/app/_components/doc";
import { NilState } from "@/app/_components/page-chrome";
import { Ledger, LedgerEntry } from "@/app/_components/forms";
import { getVenueMeta } from "@/lib/queries/dimensions";
import { listShows } from "@/lib/queries/shows";
import { locationLine, compact, formatShortDate } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { entityMetadata } from "@/lib/site";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params, parent: ResolvingMetadata): Promise<Metadata> {
  const { id } = await params;
  const venueId = parseInt(id, 10);
  const venue = Number.isNaN(venueId) ? null : await getVenueMeta(venueId);
  if (!venue) return { title: "Venue not found" };
  const description = `All ${venue.shows} Goose show${venue.shows === 1 ? "" : "s"} at ${venue.name}${venue.city ? `, ${venue.city}` : ""}.`;
  return {
    title: venue.name,
    description,
      ...entityMetadata({ title: venue.name, description, path: `/venues/${venue.venueId}`, parent: await parent }),
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
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/venues", label: "Venues" }, { label: venue.name }]} />
          <h1>{venue.name}</h1>
          <MetaTable rows={[
            { k: "Location", v: locationLine(venue.city, venue.state, venue.country) || "—" },
            ...(venue.capacity && venue.capacity > 0 ? [{ k: "Capacity", v: compact(venue.capacity) }] : []),
            { k: "Shows", v: venue.shows },
            ...(venue.first ? [{ k: "First", v: venue.first }] : []),
            ...(venue.last ? [{ k: "Last", v: venue.last }] : []),
          ]} />
          <DocSection title="Shows here"><ShowTable shows={shows} hideVenue /></DocSection>
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
      {/* PageHead-style markup, written inline: the kicker carries a real
          venues link (PageHead's own kicker is plain text only). */}
      <header className="border-b border-line">
        <Container className="py-10 sm:py-14">
          <p className="text-[0.7rem] lowercase text-faint">
            <Link href="/venues" className="text-spruce underline underline-offset-4 transition hover:text-ink">
              venues
            </Link>
          </p>
          <h1 className="mt-1 text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {venue.name}
          </h1>
          {loc && (
            <p className="mt-3 flex items-center gap-1.5 text-muted">
              <MapPin className="h-4 w-4 text-faint" />
              {loc}
            </p>
          )}
          <p className="mt-2 font-mono text-[0.75rem] text-faint">
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
          <NilState>No shows logged yet.</NilState>
        ) : (
          <div>
            <p className="mb-4 font-mono text-xs text-faint">
              {shows.length} {shows.length === 1 ? "show" : "shows"} — newest first
            </p>
            <Ledger seed={`venue-${venueId}`}>
              {shows.map((show) => (
                <LedgerEntry key={show.showId} show={show} context="venue" />
              ))}
            </Ledger>
          </div>
        )}
      </Container>
    </article>
  );
}

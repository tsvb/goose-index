import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { MapPin } from "@/app/_components/marks";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { listVenues } from "@/lib/queries/dimensions";
import { locationLine, compact } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";

export const metadata: Metadata = {
  title: "Venues",
  description: "Every venue Goose has played, sorted by show count or name.",
};

type SearchParams = { sort?: "shows" | "name" };

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { sort = "shows" } = await searchParams;
  const venues = await listVenues({ sort });
  const experience = await getExperience();

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Almanac" }, { label: "Venues" }]} />
          <h1>Venues</h1>
          <p className="doc-crumb">{venues.length} venues</p>
          <EntityTable rows={venues.map((v) => ({ href: `/venues/${v.venueId}`, name: v.name, sub: locationLine(v.city, v.state, v.country), count: v.shows }))} />
        </Doc>
      </Container>
    );
  }

  return (
    <>
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-12 sm:py-16">
          <span className="eyebrow rise" style={{ animationDelay: "0ms" }}>
            Where Goose plays
          </span>
          <h1
            className="rise mt-4 font-display text-[2.6rem] leading-none tracking-tight text-ink sm:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            Venues
          </h1>
          <p
            className="rise mt-2 font-mono text-xs text-faint"
            style={{ animationDelay: "120ms" }}
          >
            {venues.length} venues
          </p>
        </Container>
      </header>

      {/* Sort + list */}
      <Container className="py-10">
        {/* Sort toggle */}
        <div className="mb-6 flex items-center gap-1 font-mono text-xs">
          <Link
            href="/venues?sort=shows"
            className={
              sort !== "name"
                ? "rounded px-2.5 py-1 text-gold ring-1 ring-gold/40 bg-gold/10"
                : "rounded px-2.5 py-1 text-muted hover:text-ink transition"
            }
          >
            Most shows
          </Link>
          <Link
            href="/venues?sort=name"
            className={
              sort === "name"
                ? "rounded px-2.5 py-1 text-gold ring-1 ring-gold/40 bg-gold/10"
                : "rounded px-2.5 py-1 text-muted hover:text-ink transition"
            }
          >
            A–Z
          </Link>
        </div>

        {/* Ledger list */}
        <div className="surface-card overflow-hidden">
          {venues.map((v) => {
            const loc = locationLine(v.city, v.state, v.country);
            return (
              <Link
                key={v.venueId}
                href={`/venues/${v.venueId}`}
                className="group grid grid-cols-[1fr_auto] items-center gap-4 border-b border-line-soft px-5 py-3.5 transition last:border-0 hover:bg-surface-2"
              >
                {/* Left: name + location */}
                <div className="min-w-0">
                  <div className="truncate font-display text-base text-ink transition group-hover:text-gold">
                    {v.name}
                  </div>
                  {loc && (
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted">
                      <MapPin className="h-3 w-3 shrink-0 text-faint" />
                      {loc}
                    </div>
                  )}
                </div>

                {/* Right: stats */}
                <div className="shrink-0 text-right font-mono text-[0.68rem] text-faint">
                  <span className="text-ink">{compact(v.shows)}</span>{" "}
                  {v.shows === 1 ? "show" : "shows"}
                  {v.capacity != null && v.capacity > 0 && (
                    <>
                      {" · "}cap.{" "}
                      <span className="text-ink">{compact(v.capacity)}</span>
                    </>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </>
  );
}

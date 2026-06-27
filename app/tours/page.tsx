import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { SectionHeader } from "@/app/_components/section-header";
import { listTours } from "@/lib/queries/dimensions";
import { formatShortDate } from "@/lib/queries/format";

export const metadata: Metadata = {
  title: "Tours",
  description: "Every Goose run and era, from first show to last night.",
};

export default async function ToursPage() {
  const tours = await listTours();

  // Group by year for divider treatment
  const groups: { year: number | null; tours: typeof tours }[] = [];
  for (const tour of tours) {
    const y = tour.year ?? null;
    const last = groups[groups.length - 1];
    if (!last || last.year !== y) {
      groups.push({ year: y, tours: [tour] });
    } else {
      last.tours.push(tour);
    }
  }

  return (
    <>
      {/* Header */}
      <header className="border-b border-line">
        <Container className="py-12 sm:py-16">
          <span className="eyebrow">Runs &amp; eras</span>
          <h1 className="mt-3 font-display text-[2.4rem] leading-none tracking-tight text-ink sm:text-5xl">
            Tours
          </h1>
          <p className="mt-3 font-mono text-xs text-faint">
            {tours.length} tours
          </p>
        </Container>
      </header>

      {/* List */}
      <Container className="py-10 sm:py-14">
        <div className="surface-card overflow-hidden">
          {groups.map((group) => (
            <div key={group.year ?? "unknown"}>
              {/* Year divider */}
              <div className="border-b border-line bg-surface-2 px-4 py-2">
                <span className="eyebrow">{group.year ?? "—"}</span>
              </div>

              {group.tours.map((tour) => (
                <Link
                  key={tour.tourId}
                  href={`/tours/${tour.tourId}`}
                  className="group flex flex-col gap-1 border-b border-line-soft px-4 py-4 transition last:border-0 hover:bg-surface-2 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <span className="flex-1 font-display text-lg text-ink transition group-hover:text-gold">
                    {tour.name}
                  </span>
                  <span className="font-mono text-xs text-faint">
                    {tour.start && tour.end
                      ? `${formatShortDate(tour.start)} – ${formatShortDate(tour.end)} · ${tour.shows} ${tour.shows === 1 ? "show" : "shows"}`
                      : tour.start
                      ? `From ${formatShortDate(tour.start)} · ${tour.shows} ${tour.shows === 1 ? "show" : "shows"}`
                      : `${tour.shows} ${tour.shows === 1 ? "show" : "shows"}`}
                  </span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}

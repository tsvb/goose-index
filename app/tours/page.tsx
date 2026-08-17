import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { listTours, tourTimeline } from "@/lib/queries/dimensions";
import { TourTimeline } from "@/app/_components/tour-timeline";
import { PageHead, chromeDate } from "@/app/_components/page-chrome";
import { SectionRule, Ledger } from "@/app/_components/forms";
import { formatShortDate } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Tours",
  description: "Every Goose run and era, from first show to last night.",
  alternates: { canonical: canonicalUrl("/tours") },
};

export default async function ToursPage() {
  const [tours, timeline] = await Promise.all([listTours(), tourTimeline()]);
  const experience = await getExperience();
  // Rendered server-side, so "today" is the server's day — the same clock the
  // rest of the site's `current_date` comparisons already use.
  const today = new Date().toISOString().slice(0, 10);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Tours" }]} />
          <h1>Tours</h1>
          <p className="doc-crumb">{tours.length} tours</p>
          <EntityTable rows={tours.map((t) => ({ href: `/tours/${t.tourId}`, name: t.name, sub: t.start && t.end ? `${formatShortDate(t.start)} – ${formatShortDate(t.end)}` : String(t.year), count: t.shows }))} />
        </Doc>
      </Container>
    );
  }

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
    <Container>
      <PageHead kicker="runs & eras" title="tours" meta={`${tours.length} tours`} />

      <section className="mb-10">
        <SectionRule title="the touring year" seed="tours-timeline" />
        <p className="mb-4 mt-1 font-mono text-xs text-faint">
          Every tour across the calendar it ran on. A list makes an eleven-week summer and a two-week Europe leg look
          the same; this doesn&apos;t.
        </p>
        <TourTimeline tours={timeline.tours} untouredShows={timeline.untouredShows} today={today} />
      </section>

      {/* List, grouped by year */}
      <div>
        {groups.map((group) => (
          <div key={group.year ?? "unknown"} className="mb-8">
            {group.year != null ? (
              <SectionRule
                title={group.year}
                href={`/years/${group.year}`}
                linkLabel={`year ${group.year} page`}
                seed={`tours-year-${group.year}`}
              />
            ) : (
              <SectionRule title="—" seed="tours-year-unknown" />
            )}
            <Ledger seed={`tours-group-${group.year ?? "unknown"}`}>
              {group.tours.map((tour) => (
                <Link
                  key={tour.tourId}
                  href={`/tours/${tour.tourId}`}
                  className="group flex items-baseline justify-between gap-4 py-2.5"
                >
                  <span className="min-w-0 truncate text-ink underline-offset-4 group-hover:underline">
                    {tour.name}
                  </span>
                  <span className="shrink-0 text-right font-mono text-[0.7rem] text-faint">
                    {tour.start && tour.end
                      ? `${chromeDate(tour.start)} – ${chromeDate(tour.end)} · ${tour.shows} ${tour.shows === 1 ? "show" : "shows"}`
                      : tour.start
                      ? `from ${chromeDate(tour.start)} · ${tour.shows} ${tour.shows === 1 ? "show" : "shows"}`
                      : `${tour.shows} ${tour.shows === 1 ? "show" : "shows"}`}
                  </span>
                </Link>
              ))}
            </Ledger>
          </div>
        ))}
      </div>
    </Container>
  );
}

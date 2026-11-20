import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { listTours, tourTimeline, tourRuns } from "@/lib/queries/dimensions";
import { getUpcomingShows, listShows } from "@/lib/queries/shows";
import { ToursShelf } from "./_shelf";
import { shelveTours, dayLabel } from "./shelf";
import { TourTimeline } from "@/app/_components/tour-timeline";
import { PageHead, chromeDate } from "@/app/_components/page-chrome";
import { SectionRule, Ledger } from "@/app/_components/forms";
import { formatShortDate } from "@/lib/queries/format";
import { getExperience, type EditionProps } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";
import { etToday } from "@/lib/today";

export const metadata: Metadata = {
  title: "Tours",
  description: "Every Goose run and era, from first show to last night.",
  alternates: { canonical: canonicalUrl("/tours") },
};

export default async function ToursPage({ params }: EditionProps) {
  const experience = await getExperience(params);
  // Same clock as every query on the page — ET, not the server's zone.
  const today = etToday();

  // 3.0 shelves the runs by when, as Yeti's Videos tab does (spec 2026-11-18,
  // round 3); 2.0 and 1.0 keep the list and the calendar below.
  if (experience === "fancy") {
    const [{ runs }, upcomingShows] = await Promise.all([tourRuns(), getUpcomingShows(60)]);
    const { running, upcoming } = shelveTours(runs, today);
    const runningShows = running ? (await listShows({ tourId: running.tourId, perPage: 400, dir: "asc" })).rows : [];
    // A show filed under no run carries a null tour name (shows.ts maps the
    // upstream "Not Part of a Tour" placeholder to null).
    const oneOffs = upcomingShows.filter((s) => s.tour == null);
    const nextDate = [upcoming[0]?.start, oneOffs[0]?.date].filter((d): d is string => !!d).sort()[0];
    const first = runs.reduce((y, r) => Math.min(y, Number(r.start.slice(0, 4))), Infinity);
    const meta = [
      `${runs.length} runs${Number.isFinite(first) ? ` since ${first}` : ""}`,
      running ? `${running.name} is on the road` : nextDate ? `home until ${dayLabel(nextDate)}` : null,
    ].filter(Boolean).join(" · ");
    return (
      <Container>
        <PageHead title="tours" meta={meta} />
        <ToursShelf runs={runs} today={today} runningShows={runningShows} oneOffs={oneOffs} />
      </Container>
    );
  }

  const [tours, timeline] = await Promise.all([listTours(), tourTimeline()]);

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
      <PageHead title="tours" meta={`${tours.length} tours`} />

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

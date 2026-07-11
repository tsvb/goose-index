import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata, ResolvingMetadata } from "next";
import { Container } from "@/app/_components/container";
import { Setlist } from "@/app/_components/setlist";
import { ArrowLeft, ArrowRight } from "@/app/_components/marks";
import { ShowHeader } from "@/app/_components/show-header";
import { LiveRefresh } from "@/app/_components/live-refresh";
import { liveCandidateDate } from "@/lib/live";
import { maybeLiveSync } from "@/lib/sync/maybe-live";
import { getShowDetails, getSetlist, getShowNeighbors } from "@/lib/queries/shows";
import { getExperience } from "@/lib/experience.server";
import { JsonLd } from "@/app/_components/json-ld";
import { showJsonLd } from "@/lib/jsonld";
import {
  formatLongDate,
  formatShortDate,
  locationLine,
  showHref,
} from "@/lib/queries/format";
import { entityOpenGraph } from "@/lib/site";

type Params = { params: Promise<{ date: string }>; searchParams: Promise<{ n?: string }> };

function isValidShowDate(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const [, m, day] = d.split("-").map(Number);
  return m >= 1 && m <= 12 && day >= 1 && day <= 31;
}

async function resolveShow(date: string, n?: string) {
  if (!isValidShowDate(date)) return null;
  const details = await getShowDetails(date);
  if (details.length === 0) return null;
  const order = n ? parseInt(n, 10) : null;
  return (order && details.find((d) => d.order === order)) || details[0];
}

export async function generateMetadata({ params, searchParams }: Params, parent: ResolvingMetadata): Promise<Metadata> {
  const { date } = await params;
  const { n } = await searchParams;
  const show = await resolveShow(date, n);
  if (!show) return { title: "Show not found" };
  const where = show.venue ? `${show.venue}, ${locationLine(show.city, show.state, show.country)}` : "";
  const title = `${formatShortDate(date)} · ${show.venue ?? "Goose"}`;
  const description = `Goose setlist for ${formatLongDate(date)}${where ? ` at ${where}` : ""}.`;
  return {
    title,
    description,
    openGraph: entityOpenGraph({ title, description, path: `/shows/${date}`, parent: await parent }),
  };
}

export default async function ShowPage({ params, searchParams }: Params) {
  const { date } = await params;
  const { n } = await searchParams;
  if (!isValidShowDate(date)) notFound();
  const details = await getShowDetails(date);
  if (details.length === 0) notFound();
  const order = n ? parseInt(n, 10) : null;
  const show = (order && details.find((d) => d.order === order)) || details[0];

  const [setlist, neighbors] = await Promise.all([
    getSetlist(show.showId),
    getShowNeighbors(date, show.order),
  ]);

  const experience = await getExperience();
  const ld = showJsonLd(show, setlist);

  const siblings = details.filter((d) => d.showId !== show.showId);

  // On multi-show dates a neighbor can share this page's date: label it as a
  // same-day show rather than a "night" so the step through ?n= reads right.
  const prevSameDay = neighbors.prev?.date === date;
  const nextSameDay = neighbors.next?.date === date;
  const prevLabel = prevSameDay ? "Earlier show this day" : "Previous night";
  const nextLabel = nextSameDay ? "Later show this day" : "Next night";

  // This show is (or could be) on stage right now: refresh the setlist from
  // elgoose after the response is sent (debounced server-side), and let the
  // client re-pull the page while it stays open.
  const isLive = liveCandidateDate(new Date()) === date;
  if (isLive) after(() => maybeLiveSync());

  return (
    <article>
      <JsonLd data={ld} />
      {/* Top bar */}
      {experience !== "minimal" && (
        <div className="border-b border-line">
          <Container className="flex items-center justify-between gap-4 py-3.5">
            <Link href="/shows" className="group flex items-center gap-1.5 font-mono text-xs text-muted transition hover:text-ink">
              <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
              All shows
            </Link>
            <div className="flex items-center gap-1 font-mono text-xs">
              {neighbors.prev && (
                <Link href={showHref(neighbors.prev.date, neighbors.prev.order)} className="rounded px-2 py-1 text-muted transition hover:bg-surface hover:text-ink" title={prevSameDay ? prevLabel : neighbors.prev.venue ?? ""}>
                  ‹ {formatShortDate(neighbors.prev.date)}
                </Link>
              )}
              {neighbors.next && (
                <Link href={showHref(neighbors.next.date, neighbors.next.order)} className="rounded px-2 py-1 text-muted transition hover:bg-surface hover:text-ink" title={nextSameDay ? nextLabel : neighbors.next.venue ?? ""}>
                  {formatShortDate(neighbors.next.date)} ›
                </Link>
              )}
            </div>
          </Container>
        </div>
      )}

      {isLive && (
        <div className={experience === "minimal" ? undefined : "border-b border-line"}>
          <Container className={experience === "minimal" ? "pt-4" : "flex items-center gap-3 py-3"}>
            <LiveRefresh minimal={experience === "minimal"} />
            {experience !== "minimal" && (
              <span className="font-mono text-xs text-faint">setlist updates automatically while the show is on</span>
            )}
          </Container>
        </div>
      )}

      <ShowHeader show={show} date={date} setlist={setlist} experience={experience} />

      {/* Also this day */}
      {siblings.length > 0 && (
        <div className="border-b border-line">
          <Container className="py-4">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-faint">
              Also this day:
              {siblings.map((s) => (
                <Link key={s.showId} href={showHref(s.date, s.order)} className="flex max-w-full items-center gap-1 rounded border border-line px-2 py-0.5 text-muted transition hover:border-gold hover:text-gold">
                  <span className="shrink-0">Show {s.order}</span>
                  {s.venue && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="max-w-[11rem] truncate">{s.venue}</span>
                    </>
                  )}
                </Link>
              ))}
            </div>
          </Container>
        </div>
      )}

      {/* Body */}
      <Container size="prose" className="py-12">
        {show.notes && (experience === "minimal" ? (
          <p className="mb-6 text-muted"><span className="text-ink">Notes:</span> {show.notes}</p>
        ) : (
          <aside className="mb-10 rounded-lg border-l-2 border-gold bg-surface/60 px-5 py-4">
            <span className="eyebrow">From the notes</span>
            <p className="mt-2 leading-relaxed text-ink">{show.notes}</p>
          </aside>
        ))}

        <Setlist entries={setlist} experience={experience} showDate={date} venue={show.venue} />
        {experience === "minimal" && (
          <details className="mt-10 border-t border-line pt-4 text-sm">
            <summary className="cursor-pointer text-muted">Structured data (schema.org MusicEvent)</summary>
            <pre className="mt-3 overflow-auto rounded border border-line bg-surface p-3 font-mono text-xs text-muted">
              {JSON.stringify(ld, null, 2)}
            </pre>
          </details>
        )}
      </Container>

      {/* Prev / next */}
      {experience === "minimal" ? (
        <nav className="border-t border-line">
          <Container className="flex flex-wrap justify-between gap-4 py-6 text-sm">
            {neighbors.prev ? (
              <Link href={showHref(neighbors.prev.date, neighbors.prev.order)}>← {prevSameDay ? prevLabel : formatShortDate(neighbors.prev.date)}{neighbors.prev.venue ? ` · ${neighbors.prev.venue}` : ""}</Link>
            ) : <span />}
            {neighbors.next ? (
              <Link href={showHref(neighbors.next.date, neighbors.next.order)}>{nextSameDay ? nextLabel : formatShortDate(neighbors.next.date)}{neighbors.next.venue ? ` · ${neighbors.next.venue}` : ""} →</Link>
            ) : <span />}
          </Container>
        </nav>
      ) : (
        <nav className="border-t border-line">
          <Container className="grid gap-3 py-8 sm:grid-cols-2">
            {neighbors.prev ? (
              <Link href={showHref(neighbors.prev.date, neighbors.prev.order)} className="group flex flex-col rounded-lg border border-line bg-surface p-5 transition hover:border-gold/55 hover:bg-surface-2">
                <span className="flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-wider text-faint">
                  <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" /> {prevLabel}
                </span>
                <span className="mt-2 font-display text-lg text-ink group-hover:text-gold">{formatShortDate(neighbors.prev.date)}</span>
                <span className="text-sm text-muted">{neighbors.prev.venue}</span>
              </Link>
            ) : (
              <div />
            )}
            {neighbors.next && (
              <Link href={showHref(neighbors.next.date, neighbors.next.order)} className="group flex flex-col items-end rounded-lg border border-line bg-surface p-5 text-right transition hover:border-gold/55 hover:bg-surface-2">
                <span className="flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-wider text-faint">
                  {nextLabel} <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </span>
                <span className="mt-2 font-display text-lg text-ink group-hover:text-gold">{formatShortDate(neighbors.next.date)}</span>
                <span className="text-sm text-muted">{neighbors.next.venue}</span>
              </Link>
            )}
          </Container>
        </nav>
      )}
    </article>
  );
}

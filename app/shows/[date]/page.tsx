import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import type { Metadata, ResolvingMetadata } from "next";
import { Container } from "@/app/_components/container";
import { Setlist } from "@/app/_components/setlist";
import { ArrowLeft } from "@/app/_components/marks";
import { ShowHeader } from "@/app/_components/show-header";
import { LiveRefresh } from "@/app/_components/live-refresh";
import { FolioNav, NilState, chromeLink, chromeDate } from "@/app/_components/page-chrome";
import { PenRule } from "@/app/_components/pen";
import { liveCandidateDate } from "@/lib/live";
import { maybeLiveSync } from "@/lib/sync/maybe-live";
import { getShowDetails, getSetlist, getShowNeighbors, getShowEntryNumber, type ShowNeighbor } from "@/lib/queries/shows";
import { getExperience } from "@/lib/experience.server";
import type { Experience } from "@/lib/experience";
import { JsonLd } from "@/app/_components/json-ld";
import { showJsonLd } from "@/lib/jsonld";
import { Doc, Breadcrumb, DocSection } from "@/app/_components/doc";
import {
  formatLongDate,
  formatShortDate,
  locationLine,
  showHref,
  yearOf,
} from "@/lib/queries/format";
import { canonicalUrl, entityMetadata } from "@/lib/site";

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
  // A shape-valid date with no logged show gets a titled "no show" page;
  // genuine garbage keeps the plain 404 title.
  if (!show) {
    return isValidShowDate(date)
      ? { title: `No show on ${formatShortDate(date)}`, alternates: { canonical: canonicalUrl(`/shows/${date}`) } }
      : { title: "Show not found" };
  }
  const where = show.venue ? `${show.venue}, ${locationLine(show.city, show.state, show.country)}` : "";
  const title = `${formatShortDate(date)} · ${show.venue ?? "Goose"}`;
  const description = `Goose setlist for ${formatLongDate(date)}${where ? ` at ${where}` : ""}.`;
  // Multi-show dates: canonical includes ?n= only when the resolved show is
  // not the default (order 1), so ?n=1 collapses to /shows/<date>.
  const path = show.order && show.order > 1 ? `/shows/${date}?n=${show.order}` : `/shows/${date}`;
  return {
    title,
    description,
    ...entityMetadata({ title, description, path, parent: await parent }),
  };
}

export default async function ShowPage({ params, searchParams }: Params) {
  const { date } = await params;
  const { n } = await searchParams;
  if (!isValidShowDate(date)) notFound();
  const details = await getShowDetails(date);
  if (details.length === 0) {
    // Date-shaped dead end: the URL is a real calendar date, just one Goose
    // never played (or that isn't logged). Offer a way out instead of a 404.
    const [experience, neighbors] = await Promise.all([
      getExperience(),
      getShowNeighbors(date, 0),
    ]);
    return <NoShowPage date={date} experience={experience} neighbors={neighbors} />;
  }
  const order = n ? parseInt(n, 10) : null;
  const show = (order && details.find((d) => d.order === order)) || details[0];

  // entryNumber rides the same round trip — a single indexed COUNT, cheap
  // enough to fetch unconditionally rather than serialize behind the
  // experience cookie. Null (upcoming / nothing logged) drops just the
  // entry-count center of the folio footer, not the footer itself.
  const [setlist, neighbors, entryNumber] = await Promise.all([
    getSetlist(show.showId),
    getShowNeighbors(date, show.order),
    getShowEntryNumber(date, show.order),
  ]);

  const experience = await getExperience();
  const ld = showJsonLd(show, setlist);

  const siblings = details.filter((d) => d.showId !== show.showId);

  // On multi-show dates a neighbor can share this page's date: label it as a
  // same-day show rather than a "night" so the step through ?n= reads right.
  // Only read when *SameDay is true, so both labels are always the same-day
  // phrasing — there's no cross-date fallback to compute.
  const prevSameDay = neighbors.prev?.date === date;
  const nextSameDay = neighbors.next?.date === date;
  const prevLabel = "Earlier show this day";
  const nextLabel = "Later show this day";

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
              <ArrowLeft className="h-3.5 w-3.5 transition" />
              All shows
            </Link>
            <div className="flex items-center gap-1 font-mono text-xs">
              {neighbors.prev && (
                <Link href={showHref(neighbors.prev.date, neighbors.prev.order)} className="text-muted transition hover:text-ink" title={prevSameDay ? prevLabel : neighbors.prev.venue ?? ""}>
                  ‹ {chromeDate(neighbors.prev.date)}
                </Link>
              )}
              {neighbors.next && (
                <Link href={showHref(neighbors.next.date, neighbors.next.order)} className="text-muted transition hover:text-ink" title={nextSameDay ? nextLabel : neighbors.next.venue ?? ""}>
                  {chromeDate(neighbors.next.date)} ›
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
                <Link key={s.showId} href={showHref(s.date, s.order)} className={chromeLink}>
                  Show {s.order}{s.venue ? ` · ${s.venue}` : ""}
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
          <aside className="show-notes-aside mb-10">
            <PenRule seed={`notes-${date}`} />
            <p className="my-3 text-[0.7rem] lowercase text-faint">from the notes</p>
            <p className="leading-relaxed italic text-ink">{show.notes}</p>
            <PenRule seed={`notes-b-${date}`} className="mt-3" />
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

      {/* Prev / next. Minimal keeps its own plain inline nav (same-day words +
          venue right in the link text — no top bar there to carry them);
          functional/fancy share the folio footer, its labels carrying the
          neighbor's venue same as the approved mockup. */}
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
        <footer className="border-t border-line-soft">
          <Container className="py-6">
            <FolioNav
              prevHref={neighbors.prev ? showHref(neighbors.prev.date, neighbors.prev.order) : null}
              nextHref={neighbors.next ? showHref(neighbors.next.date, neighbors.next.order) : null}
              prevLabel={neighbors.prev ? `${chromeDate(neighbors.prev.date)}${neighbors.prev.venue ? ` · ${neighbors.prev.venue}` : ""}` : "previous"}
              nextLabel={neighbors.next ? `${chromeDate(neighbors.next.date)}${neighbors.next.venue ? ` · ${neighbors.next.venue}` : ""}` : "next"}
              center={entryNumber != null ? `entry no. ${entryNumber}` : undefined}
            />
          </Container>
        </footer>
      )}
    </article>
  );
}

// Rendered when the date parses but no show is logged for it. Keeps people
// moving — the year, the nearest shows on either side, and On This Day — in
// all three experiences, rather than dead-ending on a 404.
function NoShowPage({
  date,
  experience,
  neighbors,
}: {
  date: string;
  experience: Experience;
  neighbors: { prev: ShowNeighbor; next: ShowNeighbor };
}) {
  const year = yearOf(date);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/shows", label: "Shows" }, { label: date }]} />
          <h1>No show on {formatLongDate(date)}</h1>
          <p>Goose didn&rsquo;t play this night (or it isn&rsquo;t logged).</p>
          {(neighbors.prev || neighbors.next) && (
            <DocSection title="Nearest shows">
              <ul>
                {neighbors.prev && (
                  <li>
                    Before:{" "}
                    <Link href={showHref(neighbors.prev.date, neighbors.prev.order)}>
                      {formatShortDate(neighbors.prev.date)}
                      {neighbors.prev.venue ? ` · ${neighbors.prev.venue}` : ""}
                    </Link>
                  </li>
                )}
                {neighbors.next && (
                  <li>
                    After:{" "}
                    <Link href={showHref(neighbors.next.date, neighbors.next.order)}>
                      {formatShortDate(neighbors.next.date)}
                      {neighbors.next.venue ? ` · ${neighbors.next.venue}` : ""}
                    </Link>
                  </li>
                )}
              </ul>
            </DocSection>
          )}
          <p>
            Browse <Link href={`/shows?year=${year}`}>all {year} shows</Link>, or see{" "}
            <Link href="/on-this-day">On This Day</Link>.
          </p>
        </Doc>
      </Container>
    );
  }

  return (
    <article>
      <Container className="py-14 sm:py-20">
        <h1 className="font-display text-[2.6rem] leading-[1.06] tracking-tight text-ink sm:text-5xl">
          No show on {formatLongDate(date)}
        </h1>
        <div className="mt-6">
          <NilState href={`/shows?year=${year}`} linkLabel={`browse ${year} shows`}>
            Goose didn&rsquo;t play this night (or it isn&rsquo;t logged). See{" "}
            <Link href="/on-this-day" className={chromeLink}>on this day</Link>
          </NilState>
        </div>
      </Container>

      {(neighbors.prev || neighbors.next) && (
        <footer className="border-t border-line-soft">
          <Container className="py-6">
            <FolioNav
              prevHref={neighbors.prev ? showHref(neighbors.prev.date, neighbors.prev.order) : null}
              nextHref={neighbors.next ? showHref(neighbors.next.date, neighbors.next.order) : null}
              prevLabel="nearest before"
              nextLabel="nearest after"
            />
          </Container>
        </footer>
      )}
    </article>
  );
}

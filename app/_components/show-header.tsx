import Link from "@/app/_components/link";
import { Container } from "./container";
import { MapPin } from "./marks";
import { Doc, Breadcrumb, MetaTable } from "./doc";
import { chromeLink } from "./page-chrome";
import { dateParts, locationLine, formatDuration, trackSeconds } from "@/lib/queries/format";
import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";
import type { Experience } from "@/lib/experience";
import { NugsLink } from "./nugs-link";
import { nugsShowHref, nugsWebFallback, nugsWebHref } from "@/lib/nugs";
import { bandcampHref } from "@/lib/bandcamp";
import { Pack, ShowSquare } from "./yeti";

/** The band's own release of this night, when they've put one out — 445 of the
 * shows have one. nugs is a subscription; Bandcamp is where buying the music
 * actually pays the band, so it goes first. */
function ShowBandcamp({ url, minimal = false }: { url: string | null; minimal?: boolean }) {
  const href = bandcampHref(url);
  if (!href) return null;
  if (minimal) {
    return (
      <>
        <a href={href} target="_blank" rel="noopener noreferrer">buy on bandcamp</a>
        {" · "}
      </>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="nugs-show bandcamp"
      title="Buy this show from the band on Bandcamp"
    >
      ◈ Bandcamp
    </a>
  );
}

function ShowNugs({
  date, venue, containerId, hasVideo, minimal = false,
}: {
  date: string; venue: string | null;
  containerId: number | null;
  hasVideo: boolean | null;
  minimal?: boolean;
}) {
  // With a resolved container the fallback is the show's own page; without one it
  // stays the artist+date search that shipped before this feature.
  const audioFallback = nugsWebFallback({ date, venue, containerId });
  // Watch's fallback lands on the exact video page only when the container is
  // known to carry video — 283 of 485 containers are audio-only (measured
  // 2026-08-18), and sending an app-less Watch click to a video route with no
  // video isn't better than the search. hasVideo is null when unresolved, and
  // that also degrades to the search.
  const videoFallback = nugsWebFallback({ date, venue, containerId: hasVideo ? containerId : null, media: "video" });

  if (minimal) {
    return (
      <>
        <NugsLink href={nugsShowHref({ date, venue })} fallback={audioFallback} className="nugs-show">listen on nugs</NugsLink>
        {" · "}
        <NugsLink href={nugsShowHref({ date, venue, media: "video" })} fallback={videoFallback} className="nugs-show watch">watch</NugsLink>
        {containerId != null && (
          <>
            {" · "}
            <a href={nugsWebHref({ containerId })} target="_blank" rel="noopener noreferrer" className="nugs-show">open on nugs.net</a>
          </>
        )}
      </>
    );
  }
  return (
    // Buttons wrap as whole units on a phone: the group wraps, the label
    // inside a button never does (.nugs-show is nowrap).
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <NugsLink href={nugsShowHref({ date, venue })} fallback={audioFallback} className="nugs-show nugs-primary" title="Play this show on nugs">▷ Listen on nugs</NugsLink>
      <NugsLink href={nugsShowHref({ date, venue, media: "video" })} fallback={videoFallback} className="nugs-show watch" title="Watch this show on nugs">▷ Watch</NugsLink>
      {containerId != null && (
        <a
          href={nugsWebHref({ containerId })}
          target="_blank"
          rel="noopener noreferrer"
          className="nugs-show"
          title="Open this show on nugs.net (sign-in required)"
        >↗ Open on nugs.net</a>
      )}
    </span>
  );
}

/** 3.0's square for a show page: the release cover, linked to the release, or
 * the date tile. */
function HeaderSquare({ show, date }: { show: ShowDetail; date: string }) {
  const square = (
    <ShowSquare
      iso={date}
      artId={show.artId}
      size="medium"
      alt={`Cover of the Bandcamp release of ${show.venue ?? "this show"}, ${date}`}
      className="w-[132px] sm:w-[168px]"
    />
  );
  const href = show.artId ? bandcampHref(show.bandcampUrl) : null;
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" className="block w-fit rounded-[16px]">
      {square}
    </a>
  ) : (
    square
  );
}

function computeStats(date: string, setlist: SetlistEntry[]) {
  const dp = dateParts(date);
  const setNumbers = new Set(
    setlist.map((e) => (e.setNumber ?? "").trim().toLowerCase()).filter(Boolean),
  );
  const encores = [...setNumbers].filter((s) => s.startsWith("e")).length;
  const setCount = Math.max(setNumbers.size - encores, setNumbers.size === 0 ? 0 : 1);
  const totalSecs = setlist.reduce((acc, e) => acc + (trackSeconds(e.trackTime) ?? 0), 0);
  const known = setlist.filter((e) => trackSeconds(e.trackTime) != null).length;
  return { dp, encores, setCount, totalSecs, known };
}

export function ShowHeader({
  show, date, setlist, experience,
}: {
  show: ShowDetail;
  date: string;
  setlist: SetlistEntry[];
  experience: Experience;
}) {
  const { dp, encores, setCount, totalSecs, known } = computeStats(date, setlist);
  const loc = locationLine(show.city, show.state, show.country);
  const durationLogged = known >= setlist.length / 2 && totalSecs > 0 ? formatDuration(totalSecs) : null;

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/shows", label: "Shows" }, { label: date }]} />
          <h1>{show.venue ? `Goose at ${show.venue}` : "Goose"}</h1>
          <p className="doc-crumb">{dp.weekday}, {dp.month} {dp.day}, {dp.year}{loc ? ` · ${loc}` : ""}</p>
          <MetaTable
            rows={[
              { k: "Date", v: `${dp.weekday}, ${dp.month} ${dp.day}, ${dp.year}` },
              ...(show.venue ? [{ k: "Venue", v: show.venueId ? <Link href={`/venues/${show.venueId}`}>{show.venue}</Link> : show.venue }] : []),
              ...(loc ? [{ k: "Location", v: loc }] : []),
              ...(show.tour ? [{ k: "Tour", v: show.tourId ? <Link href={`/tours/${show.tourId}`}>{show.tour}</Link> : show.tour }] : []),
              { k: "Songs", v: setlist.length === 0 ? "Setlist not yet posted" : `${setlist.length} · ${setCount} ${setCount === 1 ? "set" : "sets"}${encores > 0 ? ` + ${encores} encore${encores === 1 ? "" : "s"}` : ""}${durationLogged ? ` · ${durationLogged}` : ""}` },
              ...(show.permalink ? [{ k: "Source", v: <a href={`https://elgoose.net/setlists/${show.permalink}`} target="_blank" rel="noreferrer">elgoose.net</a> }] : []),
              // Nothing to play yet — a Listen row on an empty show is a dead end.
              ...(setlist.length > 0 ? [{ k: "Listen", v: <><ShowBandcamp url={show.bandcampUrl} minimal /><ShowNugs date={date} venue={show.venue} containerId={show.nugsContainerId} hasVideo={show.nugsHasVideo} minimal /></> }] : []),
            ]}
          />
        </Doc>
      </Container>
    );
  }

  if (experience === "functional") {
    return (
      <Container className="py-5">
        <div className="w2-panel flex flex-wrap items-start justify-between gap-3">
          <div>
            {/* A real h1 (functional pages had zero headings) — element only,
                the classes keep the same rendering as the old div. */}
            <h1 className="text-[1.7rem] font-extrabold leading-none tracking-tight text-ink">
              {dp.month} {dp.day}, {dp.year}
            </h1>
            <div className="mt-1 text-sm font-semibold text-muted">
              {show.venueId ? <Link href={`/venues/${show.venueId}`} className="text-[#1f6cb0] hover:underline">{show.venue}</Link> : (show.venue ?? "Unknown venue")}
              {loc ? ` · ${loc}` : ""}{show.tour ? ` · ${show.tour}` : ""}
            </div>
            {setlist.length === 0 ? (
              <div className="mt-3 text-sm font-semibold text-muted">Setlist not yet posted — check back soon.</div>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="w2-badge">{setlist.length} songs</span>
                  <span className="w2-badge">{setCount} {setCount === 1 ? "set" : "sets"}</span>
                  {encores > 0 && <span className="w2-badge">{encores} enc</span>}
                  {durationLogged && <span className="w2-badge amber">{durationLogged}</span>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-1.5"><ShowBandcamp url={show.bandcampUrl} /><ShowNugs date={date} venue={show.venue} containerId={show.nugsContainerId} hasVideo={show.nugsHasVideo} /></div>
              </>
            )}
          </div>
        </div>
      </Container>
    );
  }

  // 3.0 (Yeti): the show's square sits flat beside the nameplate: the cover of
  // the band's Bandcamp release of the night when there is one ("cover flat on
  // the shelf, no bubble"), else the date tile (Yeti's MonogramTile, its no-art
  // answer). Yeti's rule is "the pack is only for what's playing", so a show
  // page gets no bubble, except the empty pack while nothing is logged yet.
  const empty = setlist.length === 0;
  const elgoose = show.permalink ? (
    <a href={`https://elgoose.net/setlists/${show.permalink}`} target="_blank" rel="noreferrer" className={chromeLink}>View on elgoose ↗</a>
  ) : null;
  return (
    <header className="show-head border-b border-line">
      <Container className="py-8 sm:py-10">
        <div className="grid items-end gap-6 sm:grid-cols-[168px_minmax(0,1fr)] sm:gap-8">
          {empty ? (
            <Pack className="w-[168px]" />
          ) : (
            <HeaderSquare show={show} date={date} />
          )}
          <div className="min-w-0">
            {/* Casing boundary: the tour link is authored data and keeps its
                case; only the chrome words around it fold. */}
            <p className="text-[0.9rem] text-muted">
              {show.tourId && show.tour ? (
                <Link href={`/tours/${show.tourId}`} className={chromeLink}>{show.tour}</Link>
              ) : ("goose")}
              {" · "}
              {dp.weekday.toLowerCase()}
            </p>
            <h1 className="mt-1 text-[2.3rem] font-black leading-[1.04] tracking-[-0.015em] text-ink sm:text-[2.9rem]">
              {dp.month} {dp.day}, {dp.year}
            </h1>
            <p className="mt-2 text-[1.1rem] text-muted">
              at{" "}
              {show.venueId ? (
                <Link href={`/venues/${show.venueId}`} className={`font-extrabold ${chromeLink}`}>{show.venue}</Link>
              ) : (
                <span className="font-extrabold text-ink">{show.venue ?? "Unknown venue"}</span>
              )}
              {loc && <span> · {loc}</span>}
            </p>
            <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.9rem] text-muted">
              {empty ? (
                // Nothing logged yet — "0 songs · 0 sets" and dead Listen buttons
                // would read like a broken page, not a pending one.
                <>
                  <span>Setlist not yet in the ledger — check back soon</span>
                  {elgoose}
                </>
              ) : (
                <>
                  <span><b className="font-extrabold text-ink">{setlist.length}</b> songs</span>
                  <span><b className="font-extrabold text-ink">{setCount}</b> {setCount === 1 ? "set" : "sets"}</span>
                  {encores > 0 && <span><b className="font-extrabold text-ink">{encores}</b> {encores === 1 ? "encore" : "encores"}</span>}
                  {durationLogged && <span><b className="font-extrabold text-ink">{durationLogged}</b> logged</span>}
                  {elgoose}
                </>
              )}
            </div>
            {!empty && (
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <ShowBandcamp url={show.bandcampUrl} />
                <ShowNugs date={date} venue={show.venue} containerId={show.nugsContainerId} hasVideo={show.nugsHasVideo} />
              </div>
            )}
          </div>
        </div>
      </Container>
    </header>
  );
}

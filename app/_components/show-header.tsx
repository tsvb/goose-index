import Link from "next/link";
import { Container } from "./container";
import { MapPin } from "./marks";
import { Doc, Breadcrumb, MetaTable } from "./doc";
import { dateParts, locationLine, formatDuration, trackSeconds } from "@/lib/queries/format";
import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";
import type { Experience } from "@/lib/experience";
import { NugsLink } from "./nugs-link";
import { nugsShowHref, nugsWebFallback } from "@/lib/nugs";

function ShowNugs({ date, venue, minimal = false }: { date: string; venue: string | null; minimal?: boolean }) {
  const fallback = nugsWebFallback({ date, venue });
  if (minimal) {
    return (
      <>
        <NugsLink href={nugsShowHref({ date, venue })} fallback={fallback} className="nugs-show">listen on nugs</NugsLink>
        {" · "}
        <NugsLink href={nugsShowHref({ date, venue, media: "video" })} fallback={fallback} className="nugs-show watch">watch</NugsLink>
      </>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <NugsLink href={nugsShowHref({ date, venue })} fallback={fallback} className="nugs-show" title="Play this show on nugs">▷ Listen on nugs</NugsLink>
      <NugsLink href={nugsShowHref({ date, venue, media: "video" })} fallback={fallback} className="nugs-show watch" title="Watch this show on nugs">▷ Watch</NugsLink>
    </span>
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
}: { show: ShowDetail; date: string; setlist: SetlistEntry[]; experience: Experience }) {
  const { dp, encores, setCount, totalSecs, known } = computeStats(date, setlist);
  const loc = locationLine(show.city, show.state, show.country);
  const durationLogged = known >= setlist.length / 2 && totalSecs > 0 ? formatDuration(totalSecs) : null;

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Almanac" }, { href: "/shows", label: "Shows" }, { label: date }]} />
          <h1>{show.venue ? `Goose at ${show.venue}` : "Goose"}</h1>
          <p className="doc-crumb">{dp.weekday}, {dp.month} {dp.day}, {dp.year}{loc ? ` · ${loc}` : ""}</p>
          <MetaTable
            rows={[
              { k: "Date", v: `${dp.weekday}, ${dp.month} ${dp.day}, ${dp.year}` },
              ...(show.venue ? [{ k: "Venue", v: show.venueId ? <Link href={`/venues/${show.venueId}`}>{show.venue}</Link> : show.venue }] : []),
              ...(loc ? [{ k: "Location", v: loc }] : []),
              ...(show.tour ? [{ k: "Tour", v: show.tourId ? <Link href={`/tours/${show.tourId}`}>{show.tour}</Link> : show.tour }] : []),
              { k: "Songs", v: `${setlist.length} · ${setCount} ${setCount === 1 ? "set" : "sets"}${encores > 0 ? ` + ${encores} encore${encores === 1 ? "" : "s"}` : ""}${durationLogged ? ` · ${durationLogged}` : ""}` },
              ...(show.permalink ? [{ k: "Source", v: <a href={`https://elgoose.net/setlists/${show.permalink}`} target="_blank" rel="noreferrer">elgoose.net</a> }] : []),
              { k: "Listen", v: <ShowNugs date={date} venue={show.venue} minimal /> },
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
            <div className="text-[1.7rem] font-extrabold leading-none tracking-tight text-ink">
              {dp.month} {dp.day}, {dp.year}
            </div>
            <div className="mt-1 text-sm font-semibold text-muted">
              {show.venueId ? <Link href={`/venues/${show.venueId}`} className="text-gold hover:underline">{show.venue}</Link> : (show.venue ?? "Unknown venue")}
              {loc ? ` · ${loc}` : ""}{show.tour ? ` · ${show.tour}` : ""}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="w2-badge">{setlist.length} songs</span>
              <span className="w2-badge">{setCount} {setCount === 1 ? "set" : "sets"}</span>
              {encores > 0 && <span className="w2-badge">{encores} enc</span>}
              {durationLogged && <span className="w2-badge gold">{durationLogged}</span>}
            </div>
            <div className="mt-3"><ShowNugs date={date} venue={show.venue} /></div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <header className="relative overflow-hidden border-b border-line">
      <div className="stage-glow inset-x-0 top-0 h-72" />
      <Container className="relative py-12 sm:py-16">
        <span className="eyebrow">
          {show.tourId && show.tour ? (
            <Link href={`/tours/${show.tourId}`} className="transition hover:text-gold">{show.tour}</Link>
          ) : ("Goose")}
          {"  ·  "}
          {dp.weekday}
        </span>
        <h1 className="rise mt-3 font-display text-[2.6rem] leading-none tracking-tight text-ink sm:text-5xl">
          {dp.month} {dp.day}, {dp.year}
        </h1>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-xl">
          <span className="text-muted">at</span>
          {show.venueId ? (
            <Link href={`/venues/${show.venueId}`} className="font-display text-2xl text-gold underline decoration-gold/30 underline-offset-4 transition hover:decoration-gold">{show.venue}</Link>
          ) : (
            <span className="font-display text-2xl text-ink">{show.venue ?? "Unknown venue"}</span>
          )}
        </p>
        {loc && (
          <span className="mt-2 flex items-center gap-1.5 text-muted">
            <MapPin className="h-4 w-4 text-faint" /> {loc}
          </span>
        )}
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-faint">
          <span><span className="text-ink">{setlist.length}</span> songs</span>
          <span className="text-line">·</span>
          <span><span className="text-ink">{setCount}</span> {setCount === 1 ? "set" : "sets"}</span>
          {encores > 0 && (<><span className="text-line">·</span><span><span className="text-ink">{encores}</span> {encores === 1 ? "encore" : "encores"}</span></>)}
          {durationLogged && (<><span className="text-line">·</span><span><span className="text-ink">{durationLogged}</span> logged</span></>)}
          {show.permalink && (<><span className="text-line">·</span><a href={`https://elgoose.net/setlists/${show.permalink}`} target="_blank" rel="noreferrer" className="text-sage transition hover:text-ink">View on elgoose ↗</a></>)}
          <span className="text-line">·</span>
          <ShowNugs date={date} venue={show.venue} />
        </div>
      </Container>
    </header>
  );
}

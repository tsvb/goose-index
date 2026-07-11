import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, MetaTable, DocSection } from "@/app/_components/doc";
import { FactRibbon, PlaysPerYearChart, SetPlacementBars, GapSparkline, PerformanceTable } from "@/app/_components/song";
import { getSongBySlug, getSongPerformances, type SongStat } from "@/lib/queries/songs";
import { getExperience } from "@/lib/experience.server";
import type { Experience } from "@/lib/experience";
import { showHref, formatShortDate, formatDuration } from "@/lib/queries/format";
import { entityMetadata } from "@/lib/site";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) return { title: "Song not found" };
  const description = song.timesPlayed === 0
    ? `${song.name} is in the Goose songbook, but never yet played live.`
    : `Goose has played ${song.name} ${song.timesPlayed} time${song.timesPlayed === 1 ? "" : "s"}${song.debutDate ? ` since ${song.debutDate}` : ""}.`;
  return { title: song.name, description, ...entityMetadata({ title: song.name, description, path: `/songs/${slug}`, parent: await parent }) };
}

/** Legend for the gap sparkline — must describe only what the chart actually renders. */
function gapLegend(hasBusts: boolean, longestGap: number | null, timesPlayed: number): string {
  if (hasBusts) return `Orange = a "Dusted Off" return (gap in this song's longest 5%, ≥15 shows).`;
  if ((longestGap ?? 0) > 0) return `Orange = the longest gap (${longestGap} shows). No "Dusted Off" returns yet — that takes a gap of ≥15 shows.`;
  return timesPlayed === 1 ? "Played once — no gaps between plays yet." : "No gaps yet — played at every show since its debut.";
}

function facts(song: SongStat) {
  const dur = song.longestSeconds != null ? formatDuration(song.longestSeconds) : "—";
  return [
    { k: "Times played", v: song.timesPlayed },
    { k: "Rotation", v: `${song.rotationPct}%` },
    { k: "Current gap", v: song.currentGap ?? "—" },
    { k: "Avg gap", v: song.avgGap ?? "—" },
    { k: "Longest gap", v: song.longestGap ?? "—" },
    { k: "Debut", v: song.debutDate ? formatShortDate(song.debutDate) : "—" },
    { k: "Last played", v: song.lastPlayedDate ? formatShortDate(song.lastPlayedDate) : "—" },
    { k: "Longest", v: dur },
  ];
}

export default async function SongPage({ params }: Params) {
  const { slug } = await params;
  const song = await getSongBySlug(slug);
  if (!song) notFound();
  const experience = await getExperience();
  const tag = song.isOriginal ? "Original" : `Cover · ${song.originalArtist ?? "trad."}`;

  // A song with no performances has no ribbon, charts, or table worth rendering
  // — a wall of zeros reads as broken. Say what's true instead.
  if (song.timesPlayed === 0) return <NeverPlayed song={song} tag={tag} experience={experience} />;

  const perfs = await getSongPerformances(song.songId);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/songs", label: "Songs" }, { label: song.name }]} />
          <h1>{song.name}</h1>
          <p className="doc-crumb">{tag}</p>
          <MetaTable rows={facts(song).map((f) => ({ k: f.k, v: f.v }))} />
          <DocSection title="Plays per year">
            <table className="doc-table"><tbody>{song.playsPerYear.map((y) => <tr key={y.year}><td>{y.year}</td><td className="num">{y.count}</td></tr>)}</tbody></table>
          </DocSection>
          <DocSection title="Longest versions">
            <table className="doc-table"><tbody>{song.longestVersions.map((v) => <tr key={v.showId}><td className="num">{v.trackTime}</td><td><Link href={showHref(v.date, v.order)}>{v.date}</Link></td><td>{v.venue ?? "—"}</td></tr>)}</tbody></table>
          </DocSection>
          <DocSection title={`Every performance · ${perfs.length}`}>
            <table className="doc-table">
              <thead><tr><th>Date</th><th>Venue</th><th>Set</th><th className="num">Gap</th><th className="num">Time</th></tr></thead>
              <tbody>{perfs.map((p) => <tr key={p.uniqueId}><td><Link href={showHref(p.date, p.order)}>{p.date}</Link></td><td>{p.venue ?? "—"}</td><td>{p.setLabel}</td><td className="num">{p.gap ?? "—"}{p.isDustedOff ? " *" : ""}</td><td className="num">{p.trackTime ?? "—"}</td></tr>)}</tbody>
            </table>
            <p className="doc-crumb">* a "Dusted Off" return — gap in this song&apos;s longest 5% (≥15 shows).</p>
          </DocSection>
        </Doc>
      </Container>
    );
  }

  return (
    <>
      <Container className="py-7">
        <Breadcrumb trail={[{ href: "/", label: "Index" }, { href: "/songs", label: "Songs" }, { label: song.name }]} />
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-[2.2rem] leading-none tracking-tight text-ink sm:text-4xl">{song.name}</h1>
          <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-muted">{tag}</span>
        </div>
        <FactRibbon facts={facts(song)} />
        <div className="song-cols mt-6">
          <div className="space-y-7">
            <section><h2 className="mb-2 font-display text-base text-ink">Plays per year</h2><PlaysPerYearChart data={song.playsPerYear} /></section>
            <section><h2 className="mb-2 font-display text-base text-ink">Set placement</h2><SetPlacementBars placement={song.setPlacement} /></section>
            {perfs.length > 0 && <section><h2 className="mb-2 font-display text-base text-ink">Gaps &amp; returns</h2><GapSparkline perfs={perfs} /><p className="mt-2 font-mono text-[0.68rem] text-faint">{gapLegend(perfs.some((p) => p.isDustedOff), song.longestGap, perfs.length)}</p></section>}
            {song.longestVersions.length > 0 && (
              <section><h2 className="mb-2 font-display text-base text-ink">Longest versions</h2>
                <ul className="space-y-1 text-sm">{song.longestVersions.map((v) => <li key={v.showId} className="flex justify-between gap-3"><span className="tabular-nums text-gold">{v.trackTime}</span><Link href={showHref(v.date, v.order)} className="text-muted hover:text-ink">{v.date} · {v.venue ?? "—"}</Link></li>)}</ul>
              </section>
            )}
            {song.topVenues.length > 0 && (
              <section><h2 className="mb-2 font-display text-base text-ink">Top venues</h2>
                <ul className="space-y-1 text-sm">{song.topVenues.map((v) => <li key={v.venueId} className="flex justify-between gap-3"><Link href={`/venues/${v.venueId}`} className="text-muted hover:text-ink">{v.name}</Link><span className="tabular-nums text-faint">{v.count}×</span></li>)}</ul>
              </section>
            )}
          </div>
          <div>
            <h2 className="mb-2 font-display text-base text-ink">Every performance <span className="font-mono text-xs text-faint">· {perfs.length}</span></h2>
            <PerformanceTable perfs={perfs} />
          </div>
        </div>
      </Container>
    </>
  );
}

/** Empty state for songs in the book that have never been performed —
 *  the ribbon/charts/table would render a wall of zeros. */
function NeverPlayed({ song, tag, experience }: { song: SongStat; tag: string; experience: Experience }) {
  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/songs", label: "Songs" }, { label: song.name }]} />
          <h1>{song.name}</h1>
          <p className="doc-crumb">{tag}</p>
          <p>
            In the songbook, but never yet played live. When it debuts, this page will log the
            date, the venue, and every performance after it.
          </p>
          <p>
            <Link href="/songs">All songs</Link> · <Link href="/stats/debuts">Recent debuts</Link>
          </p>
        </Doc>
      </Container>
    );
  }
  return (
    <Container className="py-7">
      <Breadcrumb trail={[{ href: "/", label: "Index" }, { href: "/songs", label: "Songs" }, { label: song.name }]} />
      <div className="mt-2 flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-[2.2rem] leading-none tracking-tight text-ink sm:text-4xl">{song.name}</h1>
        <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[0.62rem] uppercase tracking-wider text-muted">{tag}</span>
      </div>
      <div className="mt-8 rounded-lg border border-dashed border-line bg-surface/50 px-6 py-14 text-center">
        <p className="font-display text-xl text-ink">In the songbook, but never yet played live.</p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted">
          The Index keeps a page for every song in the book — this one is still waiting for its
          first night. When it debuts, the plays, gaps, set placements, and longest versions will
          be logged here.
        </p>
        <p className="mt-6 font-mono text-xs">
          <Link href="/songs" className="text-sage transition hover:text-ink">Browse the catalog →</Link>
          <span className="mx-3 text-line">·</span>
          <Link href="/stats/debuts" className="text-sage transition hover:text-ink">Recent debuts →</Link>
        </p>
      </div>
    </Container>
  );
}

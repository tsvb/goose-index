import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { canonicalUrl } from "@/lib/site";
import { getExperience } from "@/lib/experience.server";
import {
  dayOfWeekJams,
  topTransitions,
  coachsNotes,
  originalsOnTheShelf,
  deepestVenues,
} from "@/lib/queries/discoveries";
import { formatShortDate } from "@/lib/queries/format";
import { CUTS } from "../cuts";
import { StatsShell, MinimalCutRow, MinimalNoteRow } from "../_shell";
import { DayOfWeekBars } from "./components/dow-bars";
import { TheShelf } from "./components/the-shelf";
import { TransitionsList } from "./components/transitions-list";
import { VenueDepth } from "./components/venue-depth";
import { CoachsNotes } from "./components/coachs-notes";

export const dynamic = "force-dynamic";

const CUT_META = CUTS.find((c) => c.slug === "oracle")!;

export const metadata: Metadata = {
  title: `${CUT_META.title} · Stats`,
  description: CUT_META.blurb,
  alternates: { canonical: canonicalUrl("/stats/oracle") },
};

export default async function OraclePage() {
  const [experience, dow, transitions, shelf, venues, notes] = await Promise.all([
    getExperience(),
    dayOfWeekJams(),
    topTransitions(),
    originalsOnTheShelf(),
    deepestVenues(),
    coachsNotes(),
  ]);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb
            trail={[
              { href: "/", label: "Goose Index" },
              { href: "/stats", label: "Stats" },
              { label: CUT_META.title },
            ]}
          />
          <h1>{CUT_META.title}</h1>
          <MinimalCutRow active="oracle" />
          <h2 className="doc-h2">Jams per show by day of the week</h2>
          <table className="doc-table">
            <thead><tr><th>Day</th><th className="num">Avg jams</th><th className="num">Shows</th></tr></thead>
            <tbody>
              {dow.map((d) => (
                <tr key={d.dow}>
                  <td>{d.dayName}</td>
                  <td className="num">{d.avgJams.toFixed(2)}</td>
                  <td className="num">{d.totalShows}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="doc-h2">Top segued transitions</h2>
          <table className="doc-table">
            <thead><tr><th>From</th><th>To</th><th className="num">Segues</th></tr></thead>
            <tbody>
              {transitions.map((t) => (
                <tr key={`${t.sourceSlug ?? t.sourceName}|${t.targetSlug ?? t.targetName}`}>
                  <td>{t.sourceSlug ? <Link href={`/songs/${t.sourceSlug}`}>{t.sourceName}</Link> : t.sourceName}</td>
                  <td>{t.targetSlug ? <Link href={`/songs/${t.targetSlug}`}>{t.targetName}</Link> : t.targetName}</td>
                  <td className="num">{t.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="doc-h2">Originals on the shelf</h2>
          <table className="doc-table">
            <thead><tr><th>Song</th><th>Last played</th><th className="num">Plays</th><th className="num">Days</th></tr></thead>
            <tbody>
              {shelf.map((s) => (
                <tr key={s.songId}>
                  <td>{s.slug ? <Link href={`/songs/${s.slug}`}>{s.name}</Link> : s.name}</td>
                  <td>{formatShortDate(s.lastPlayedDate)}</td>
                  <td className="num">{s.totalPlays}</td>
                  <td className="num">{s.daysSincePlayed}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h2 className="doc-h2">Deepest venues</h2>
          <table className="doc-table">
            <thead><tr><th>Venue</th><th className="num">Jam %</th><th className="num">Jams</th><th className="num">Shows</th></tr></thead>
            <tbody>
              {venues.map((v) => (
                <tr key={v.venueId}>
                  <td>{v.slug ? <Link href={`/venues/${v.slug}`}>{v.name}</Link> : v.name}</td>
                  <td className="num">{v.jamPercentage.toFixed(1)}</td>
                  <td className="num">{v.totalJams}</td>
                  <td className="num">{v.totalShows}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {notes.length > 0 && (
            <>
              <h2 className="doc-h2">Coach's notes</h2>
              {notes.map((n) => (
                <section key={n.showId} style={{ marginBottom: "1.2rem" }}>
                  <p className="doc-crumb">
                    <strong>{formatShortDate(n.showDate)}</strong>
                    {n.venueName ? ` · ${n.venueName}` : ""}
                  </p>
                  <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.9rem" }}>{n.coachNotes}</pre>
                </section>
              ))}
            </>
          )}
          <MinimalNoteRow cut={CUT_META} />
        </Doc>
      </Container>
    );
  }

  return (
    <StatsShell cut={CUT_META}>
      <div className="space-y-12">
        <OracleSection
          title="Never miss a Sunday show?"
          blurb="Average number of jam-tagged performances per show, by day of the week."
        >
          <DayOfWeekBars data={dow} />
        </OracleSection>

        <OracleSection
          title="Flow-state matrix"
          blurb={
            transitions.length > 0
              ? `Top ${transitions.length} segued transitions across every show, ranked by frequency.`
              : "Top segued transitions across every show, ranked by frequency."
          }
        >
          <TransitionsList data={transitions} />
        </OracleSection>

        <OracleSection
          title="The shelf"
          blurb="Originals with the longest current gap since they were last played."
        >
          <TheShelf data={shelf} />
        </OracleSection>

        <OracleSection
          title="Deepest venues"
          blurb="Venues with the highest share of jam-tagged performances (min 3 shows)."
        >
          <VenueDepth data={venues} />
        </OracleSection>

        <OracleSection
          title="From the coach's desk"
          blurb="Notes pulled from official bandcamp releases."
        >
          <CoachsNotes data={notes} />
        </OracleSection>
      </div>
    </StatsShell>
  );
}

function OracleSection({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-1 font-display text-base text-ink">{title}</h2>
      <p className="mb-3 font-mono text-xs text-faint">{blurb}</p>
      {children}
    </section>
  );
}

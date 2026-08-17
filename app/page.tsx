import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "./_components/container";
import { SearchBox } from "./_components/search-box";
import { SectionRule, Ledger, LedgerEntry, TonightEntry, ContentsRow, Figure } from "./_components/forms";
import { TickRuler } from "./_components/instrument";
import { getOverviewStats } from "@/lib/queries/stats";
import { getRecentShows, getUpcomingShows, getOnThisDay, getTonightShows } from "@/lib/queries/shows";
import { compact, yearOf, formatMonthDay, locationLine, showHref } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";
import { Doc, MetaTable, ShowTable, DocSection } from "./_components/doc";

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("/") },
};

export default async function Home() {
  const [stats, recentRaw, upcoming, onThisDay, tonight] = await Promise.all([
    getOverviewStats(),
    // Over-fetch so filtering tonight's show(s) out still leaves six cards.
    getRecentShows(9),
    getUpcomingShows(4),
    getOnThisDay(),
    getTonightShows(),
  ]);
  const experience = await getExperience();

  // Tonight's show gets its own banner — keep it out of "Latest shows", where
  // it would read as a stale "no setlist" card.
  const tonightIds = new Set(tonight.map((s) => s.showId));
  const recent = recentRaw.filter((s) => !tonightIds.has(s.showId)).slice(0, 6);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <h1>Goose Index</h1>
          <p>A complete index of every Goose show — setlists, segues, jams, venues, and tours. Setlist data from <a href="https://elgoose.net" target="_blank" rel="noreferrer">elgoose.net</a>.</p>
          <MetaTable rows={[
            ...(tonight.length > 0 ? [{
              k: "Tonight",
              v: (
                <>
                  {tonight.map((s, i) => {
                    const loc = locationLine(s.city, s.state, s.country);
                    return (
                      <span key={s.showId}>
                        {i > 0 ? " · " : ""}
                        <Link href={showHref(s.date, s.order)}>{s.venue ?? "Unknown venue"}{loc ? `, ${loc}` : ""}</Link>
                      </span>
                    );
                  })}
                  {" — the setlist will appear live"}
                </>
              ),
            }] : []),
            { k: "Shows played", v: compact(stats.showsPlayed) },
            { k: "Songs", v: compact(stats.songs) },
            { k: "Venues", v: compact(stats.venues) },
            { k: "Performances", v: compact(stats.performances) },
            ...(stats.firstDate ? [{ k: "First show", v: stats.firstDate }] : []),
            ...(stats.lastPlayedDate ? [{ k: "Last show", v: stats.lastPlayedDate }] : []),
          ]} />
          {onThisDay.length > 0 && <DocSection title="On This Day"><ShowTable shows={onThisDay.slice(0, 6)} /></DocSection>}
          <DocSection title="Recent shows"><ShowTable shows={recent} /></DocSection>
          {upcoming.length > 0 && <DocSection title="Upcoming"><ShowTable shows={upcoming} /></DocSection>}
          <DocSection title="Browse">
            <p><Link href="/shows">All shows</Link> · <Link href="/songs">Songs</Link> · <Link href="/stats">Stats</Link> · <Link href="/venues">Venues</Link> · <Link href="/tours">Tours</Link> · <Link href="/on-this-day">On This Day</Link></p>
          </DocSection>
        </Doc>
      </Container>
    );
  }

  const sinceYear = stats.firstDate ? yearOf(stats.firstDate) : null;
  const currentYear = new Date().getFullYear();
  const todayLabel = onThisDay.length ? formatMonthDay(onThisDay[0].date).toLowerCase() : "";

  return (
    <>
      {/* ---- The record ---- */}
      <section>
        <Container className="pt-12 pb-10 sm:pt-16">
          <h1 className="max-w-3xl text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            every <span className="text-steel">Goose</span> show, indexed.
          </h1>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted">
            {compact(stats.showsPlayed)} shows{sinceYear ? ` since ${sinceYear}` : ""} — full setlists
            with segues and jams, every venue, every tour, and the story of each night.
          </p>
          <div className="mt-6 max-w-xl">
            <SearchBox size="full" />
          </div>
          <div className="mt-10 flex flex-wrap items-end gap-x-10 gap-y-6">
            <Figure value={compact(stats.showsPlayed)} label="shows played" />
            <Figure value={compact(stats.performances)} label="songs played" />
            <Figure value={compact(stats.songs)} label="unique songs" />
            <Figure value={compact(stats.venues)} label="venues" />
            {sinceYear != null && (
              <span className="min-w-56 flex-1">
                <TickRuler
                  min={sinceYear}
                  max={currentYear}
                  majors={[
                    { at: sinceYear, label: String(sinceYear) },
                    { at: currentYear, label: String(currentYear) },
                  ]}
                  reading={{ at: currentYear, label: "now" }}
                />
                <span className="text-[0.68rem] lowercase text-faint">
                  the record, {sinceYear} → now
                </span>
              </span>
            )}
          </div>
        </Container>
      </section>

      {/* ---- Tonight ---- */}
      {tonight.length > 0 && (
        <section>
          <Container className="pb-6">
            <SectionRule title="tonight" seed="tonight" />
            <Ledger seed="tonight-ledger">
              {tonight.map((s) => (
                <TonightEntry key={s.showId} show={s} />
              ))}
            </Ledger>
          </Container>
        </section>
      )}

      {/* ---- On this day ---- */}
      {onThisDay.length > 0 && (
        <section>
          <Container className="pb-6">
            <SectionRule
              title={`on this day · ${todayLabel}`}
              seed="otd"
              href={onThisDay.length > 3 ? "/on-this-day" : undefined}
              linkLabel={`all ${onThisDay.length} shows`}
            />
            <Ledger seed="otd-ledger">
              {onThisDay.slice(0, 3).map((s) => (
                <LedgerEntry key={s.showId} show={s} />
              ))}
            </Ledger>
          </Container>
        </section>
      )}

      {/* ---- Latest shows ---- */}
      <section>
        <Container className="pb-6">
          <SectionRule title="latest shows" seed="latest" href="/shows" linkLabel="browse all shows" />
          <Ledger seed="latest-ledger">
            {recent.map((s) => (
              <LedgerEntry key={s.showId} show={s} />
            ))}
          </Ledger>
        </Container>
      </section>

      {/* ---- Upcoming + contents ---- */}
      <section>
        <Container className="grid gap-12 pb-16 lg:grid-cols-[1.3fr_1fr]">
          {upcoming.length > 0 && (
            <div>
              <SectionRule title="upcoming shows" seed="upcoming" />
              <Ledger seed="upcoming-ledger">
                {upcoming.map((s) => (
                  <LedgerEntry key={s.showId} show={s} />
                ))}
              </Ledger>
            </div>
          )}
          <div>
            <SectionRule title="browse the record" seed="contents" />
            <ContentsRow href="/shows" label="every show" sub={`${compact(stats.showsPlayed)} nights, by year & tour`} />
            <ContentsRow href="/songs" label="songs" sub={`${compact(stats.songsInCatalog)} songs, sorted any way`} />
            <ContentsRow href="/stats" label="stats" sub="cuts, gaps, and debuts" />
            <ContentsRow href="/venues" label="venues" sub={`${compact(stats.venues)} rooms across the map`} />
            <ContentsRow href="/tours" label="tours" sub="runs and eras, start to finish" />
          </div>
        </Container>
      </section>
    </>
  );
}

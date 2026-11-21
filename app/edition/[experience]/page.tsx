import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/app/_components/container";
import { SearchBox } from "@/app/_components/search-box";
import { SectionRule, Ledger, LedgerEntry, TonightEntry, ContentsRow, Figure } from "@/app/_components/forms";
import { TonightPack } from "@/app/_components/tonight-pack";
import { getOverviewStats } from "@/lib/queries/stats";
import { getRecentShows, getUpcomingShows, getOnThisDay, getTonightShows } from "@/lib/queries/shows";
import { compact, dateParts, locationLine, showHref } from "@/lib/queries/format";
import { getExperience, type EditionProps } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";
import { Doc, MetaTable, ShowTable, DocSection } from "@/app/_components/doc";

// Tonight's show and on-this-day turn over at midnight ET, so the cached home
// page lives five minutes rather than the layout's hour.
export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("/") },
};

export default async function Home({ params }: EditionProps) {
  const [stats, recentRaw, upcoming, onThisDay, tonight] = await Promise.all([
    getOverviewStats(),
    // Over-fetch so filtering tonight's show(s) out still leaves six entries.
    getRecentShows(9),
    getUpcomingShows(4),
    getOnThisDay(),
    getTonightShows(),
  ]);
  const experience = await getExperience(params);

  // Tonight's show gets its own ledger section — keep it out of latest shows,
  // where it would read as a stale nil entry.
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

  const todayDp = onThisDay.length ? dateParts(onThisDay[0].date) : null;
  const todayLabel = todayDp ? `${todayDp.month.slice(0, 3).toLowerCase()} ${todayDp.day}` : "";
  // The span is computed, never typed: the sync can push the first date.
  const firstYear = stats.firstDate ? stats.firstDate.slice(0, 4) : null;

  const contents = (
    <>
      <ContentsRow href="/shows" label="every show" sub={`${compact(stats.showsPlayed)} nights, by year & tour`} />
      <ContentsRow href="/songs" label="songs" sub={`${compact(stats.songsInCatalog)} songs, sorted any way`} />
      <ContentsRow href="/stats" label="stats" sub="cuts, gaps, and debuts" />
      <ContentsRow href="/venues" label="venues" sub={`${compact(stats.venues)} rooms across the map`} />
      <ContentsRow href="/tours" label="tours" sub="runs and eras, start to finish" />
    </>
  );

  if (experience === "fancy") {
    // 3.0 (Yeti). Same sections and copy as 2.0 below; the layout differs.
    // Tonight's show is the one blister pack on the site, and when it's there
    // a wide canvas gains a column (the pack beside the ledgers) instead of
    // stretching anything.
    const ledgers = (
      <>
        {onThisDay.length > 0 && (
          <section className="pb-6">
            <SectionRule
              title={`on this day · ${todayLabel}`}
              seed="otd"
              href={onThisDay.length > 3 ? "/on-this-day" : undefined}
              linkLabel={`all ${onThisDay.length} shows`}
            />
            <Ledger seed="otd-ledger">
              {onThisDay.slice(0, 3).map((s) => (
                <LedgerEntry key={s.showId} show={s} square />
              ))}
            </Ledger>
          </section>
        )}
        <section className="pb-6">
          <SectionRule title="latest shows" seed="latest" href="/shows" linkLabel="browse all shows" />
          <Ledger seed="latest-ledger">
            {recent.map((s) => (
              <LedgerEntry key={s.showId} show={s} square />
            ))}
          </Ledger>
        </section>
      </>
    );
    return (
      <>
        <section>
          <Container className="pt-12 pb-10 sm:pt-16">
            <h1 className="max-w-3xl text-[2.6rem] font-black leading-[1.04] tracking-[-0.015em] text-ink sm:text-[3.25rem]">
              Goose Index
            </h1>
            <p className="mt-3 max-w-xl text-[1.02rem] leading-relaxed text-muted">
              Every Goose show{firstYear ? ` since ${firstYear}` : ""}: setlists, segues, jams,
              venues, tours, and notes on the nights. Setlist data from elgoose.net.
            </p>
            <div className="mt-6 max-w-xl">
              <SearchBox size="full" />
            </div>
            <div className="mt-9 grid grid-cols-2 gap-x-10 gap-y-6 sm:flex sm:flex-wrap sm:items-end">
              <Figure value={compact(stats.showsPlayed)} label="shows played" href="/shows" />
              <Figure value={compact(stats.performances)} label="songs played" href="/songs" />
              <Figure value={compact(stats.songs)} label="unique songs" href="/songs" />
              <Figure value={compact(stats.venues)} label="venues" href="/venues" />
            </div>
          </Container>
        </section>

        <Container>
          {tonight.length > 0 ? (
            <div className="grid gap-x-10 gap-y-2 min-[900px]:grid-cols-[300px_minmax(0,1fr)]">
              <section className="pb-8">
                <SectionRule title="tonight" seed="tonight" />
                <div className="mt-4 grid gap-6">
                  {tonight.map((s) => (
                    <TonightPack key={s.showId} show={s} multi={tonight.length > 1} />
                  ))}
                </div>
              </section>
              <div className="min-w-0">{ledgers}</div>
            </div>
          ) : (
            ledgers
          )}
        </Container>

        <section>
          <Container className="grid gap-12 pt-4 pb-16 lg:grid-cols-[1.3fr_1fr]">
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
              {contents}
            </div>
          </Container>
        </section>
      </>
    );
  }

  return (
    <>
      {/* ---- The record ---- */}
      <section>
        <Container className="pt-12 pb-10 sm:pt-16">
          {/* Plain name, plain sentence. The figures below give the counts, so
              the sentence gives the scope — no "-ish" above an exact number,
              no one-word color accent. */}
          <h1 className="max-w-3xl font-display text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            Goose Index
          </h1>
          <p className="mt-3 max-w-xl text-[0.95rem] leading-relaxed text-muted">
            Every Goose show{firstYear ? ` since ${firstYear}` : ""}: setlists, segues, jams,
            venues, tours, and notes on the nights. Setlist data from elgoose.net.
          </p>
          <div className="mt-6 max-w-xl">
            <SearchBox size="full" />
          </div>
          <div className="mt-10 grid grid-cols-2 gap-x-10 gap-y-6 sm:flex sm:flex-wrap sm:items-end">
            <Figure value={compact(stats.showsPlayed)} label="shows played" href="/shows" />
            <Figure value={compact(stats.performances)} label="songs played" href="/songs" />
            <Figure value={compact(stats.songs)} label="unique songs" href="/songs" />
            <Figure value={compact(stats.venues)} label="venues" href="/venues" />
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

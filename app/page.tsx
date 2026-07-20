import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "./_components/container";
import { ShowCard } from "./_components/show-card";
import { SearchBox } from "./_components/search-box";
import { SectionHeader } from "./_components/section-header";
import { ArrowRight, Calendar, MapPin, Disc, Feather, Flame } from "./_components/marks";
import { getOverviewStats } from "@/lib/queries/stats";
import { getRecentShows, getUpcomingShows, getOnThisDay, getTonightShows, getLedgerEntryCount } from "@/lib/queries/shows";
import { compact, yearOf, formatMonthDay, formatLongDate, dateParts, locationLine, showHref } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";
import { Doc, MetaTable, ShowTable, DocSection } from "./_components/doc";

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("/") },
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="font-display text-[2rem] leading-none text-ink sm:text-4xl">{value}</span>
      <span className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-faint">{label}</span>
    </div>
  );
}

export default async function Home() {
  const [stats, recentRaw, upcoming, onThisDay, tonight, ledgerEntries] = await Promise.all([
    getOverviewStats(),
    // Over-fetch so filtering tonight's show(s) out still leaves six cards.
    getRecentShows(9),
    getUpcomingShows(4),
    getOnThisDay(),
    getTonightShows(),
    getLedgerEntryCount(),
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

  const sinceYear = stats.firstDate ? yearOf(stats.firstDate) : 2014;
  const todayLabel = onThisDay.length ? formatMonthDay(onThisDay[0].date) : "";

  // Nameplate figures — all computed, per the copy rules: EST. and the volume
  // come from the first logged show; "No." cites the LEDGER entry count (the
  // same sequence the show pages' Entry No. stamps count), so the masthead and
  // the newest entry's stamp can never disagree. No firstDate (empty ledger)
  // → no nameplate, rather than a faked one.
  const currentYear = new Date().getFullYear();
  const estYear = stats.firstDate ? yearOf(stats.firstDate) : null;
  const volume = estYear != null ? currentYear - estYear : null;

  return (
    <>
      {/* ---- Almanac nameplate ---- */}
      {/* Running head for the two letterpress themes; globals.css keeps it
          display:none under every other theme, so pod/xl2 render unchanged. */}
      {experience === "fancy" && estYear != null && (
        <div className="almanac-nameplate">
          {/* Internals are utility-styled: safe, since the whole block is
              display:none outside the almanac themes. Heavy printed rules are
              --ink per the handoff; the almanac line wears the structural
              accent. */}
          <Container className="pt-6">
            <p className="flex flex-wrap items-baseline justify-between gap-x-4 border-t border-ink py-2 font-mono text-[0.66rem] tracking-[0.22em] text-muted">
              <span>GOOSE INDEX</span>
              <span>
                {volume != null && volume >= 1 ? `VOL. ${romanNumeral(volume)} · ` : ""}
                {ledgerEntries > 0 ? `No. ${ledgerEntries} · ` : ""}EST. {estYear}
              </span>
            </p>
            <p className="pb-1 text-center font-mono text-[0.64rem] tracking-[0.32em] text-gold">
              AN ALMANAC OF EVERY SHOW · {estYear}&ndash;{currentYear}
            </p>
          </Container>
        </div>
      )}

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-[420px]" />
        <Container className="relative pt-16 pb-14 sm:pt-24 sm:pb-20">
          <span className="eyebrow rise" style={{ animationDelay: "0ms" }}>
            Goose Index · est. {sinceYear}
          </span>
          <h1
            className="rise mt-5 max-w-3xl font-display text-[2.7rem] leading-[1.04] tracking-tight text-ink sm:text-6xl"
            style={{ animationDelay: "60ms" }}
          >
            Every <span className="italic text-gold">Goose</span> show, indexed.
          </h1>
          <p
            className="rise mt-5 max-w-xl text-lg leading-relaxed text-muted"
            style={{ animationDelay: "120ms" }}
          >
            {compact(stats.showsPlayed)} shows since {sinceYear} — full setlists with segues and
            jams, every venue, every tour, and the story of each night.
          </p>
          <div className="rise mt-8 max-w-xl" style={{ animationDelay: "180ms" }}>
            <SearchBox size="full" />
          </div>

          <div
            className="rise mt-12 grid max-w-2xl grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4"
            style={{ animationDelay: "260ms" }}
          >
            <Stat value={compact(stats.showsPlayed)} label="Shows played" />
            <Stat value={compact(stats.performances)} label="Songs played" />
            <Stat value={compact(stats.songs)} label="Unique songs" />
            <Stat value={compact(stats.venues)} label="Venues" />
          </div>
        </Container>
      </section>

      {/* ---- Tonight ---- */}
      {tonight.length > 0 && (
        <section className="border-b border-line bg-surface/40">
          <Container className="py-10">
            <span className="live-pill">
              <span className="live-dot" aria-hidden />
              Tonight
            </span>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {tonight.map((s) => {
                const loc = locationLine(s.city, s.state, s.country);
                return (
                  <Link
                    key={s.showId}
                    href={showHref(s.date, s.order)}
                    className="group flex flex-col rounded-lg border border-ember/45 bg-surface p-5 transition duration-200 hover:-translate-y-0.5 hover:border-ember hover:bg-surface-2"
                  >
                    {tonight.length > 1 && s.order != null && (
                      <span className="eyebrow mb-2">Show {s.order}</span>
                    )}
                    <h2 className="font-display text-2xl leading-tight text-ink transition group-hover:text-gold">
                      {s.venue ?? "Unknown venue"}
                    </h2>
                    <span className="mt-1.5 flex items-center gap-1.5 text-sm text-muted">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-faint" /> {loc || "—"}
                    </span>
                    <span className="mt-4 flex items-center justify-between gap-3 border-t border-line-soft pt-3 font-mono text-[0.7rem] text-faint">
                      The setlist will appear here live as the band plays it
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 transition group-hover:translate-x-0.5 group-hover:text-gold" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {/* ---- On this day ---- */}
      {onThisDay.length > 0 && (
        <section className="border-b border-line bg-surface/40">
          <Container className="py-12">
            <div className="flex items-center gap-2 text-gold">
              <Calendar className="h-4 w-4" />
              {/* A real h2 (the section had no heading) — inline style pins the
                  eyebrow's weight/tracking against the base h2 rule (460) and
                  functional's unlayered h2 rule (800 / -0.015em). */}
              <h2 className="eyebrow" style={{ fontWeight: 400, letterSpacing: "0.22em" }}>On This Day · {todayLabel}</h2>
            </div>
            <p className="mt-3 max-w-2xl text-muted">
              {onThisDay.length === 1
                ? "Goose played one show on this date:"
                : `Goose has played ${onThisDay.length} shows on this date over the years:`}
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {onThisDay.slice(0, 3).map((s) => (
                <ShowCard key={`${s.showId}`} show={s} />
              ))}
            </div>
            {onThisDay.length > 3 && (
              <Link href="/on-this-day" className="mt-5 inline-flex items-center gap-1.5 font-mono text-xs text-sage hover:text-ink">
                All {onThisDay.length} shows on {todayLabel}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </Container>
        </section>
      )}

      {/* ---- Latest shows ---- */}
      <section>
        <Container className="py-16">
          <SectionHeader eyebrow="Freshly logged" title="Latest shows" href="/shows" linkLabel="Browse all shows" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((s) => (
              <ShowCard key={`${s.showId}`} show={s} />
            ))}
          </div>
        </Container>
      </section>

      {/* ---- Upcoming + browse ---- */}
      <section className="border-t border-line">
        <Container className="grid gap-12 py-16 lg:grid-cols-[1.3fr_1fr]">
          {upcoming.length > 0 && (
            <div>
              <SectionHeader eyebrow="On the road" title="Upcoming shows" />
              <ul className="surface-card divide-y divide-line-soft">
                {upcoming.map((s) => {
                  const dp = dateParts(s.date);
                  return (
                    <li key={`${s.showId}`}>
                      <Link
                        href={showHref(s.date, s.order)}
                        className="group flex items-center gap-4 px-4 py-4 transition hover:bg-surface-2"
                      >
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-md border border-line bg-bg text-center">
                          <span className="font-mono text-[0.6rem] uppercase text-gold-soft">{dp.month.slice(0, 3)}</span>
                          <span className="font-display text-lg leading-none text-ink">{dp.day}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-display text-base text-ink group-hover:text-gold">{s.venue}</div>
                          <div className="truncate text-sm text-muted">{locationLine(s.city, s.state, s.country)}</div>
                        </div>
                        <span className="font-mono text-xs text-faint">{dp.year}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div>
            <SectionHeader eyebrow="Find your way in" title="Browse the record" />
            <div className="flex flex-col gap-3">
              <BrowseLink href="/shows" icon={<Calendar className="h-5 w-5" />} title="Every show" sub={`${compact(stats.showsPlayed)} nights, by year & tour`} />
              <BrowseLink href="/songs" icon={<Feather className="h-5 w-5" />} title="Songs" sub={`${compact(stats.songsInCatalog)} songs, sorted any way`} />
              <BrowseLink href="/stats" icon={<Flame className="h-5 w-5" />} title="Stats" sub="Cuts, gaps, and debuts" />
              <BrowseLink href="/venues" icon={<MapPin className="h-5 w-5" />} title="Venues" sub={`${compact(stats.venues)} rooms across the map`} />
              <BrowseLink href="/tours" icon={<Disc className="h-5 w-5" />} title="Tours" sub="Runs and eras, start to finish" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}

/** 1..3999 → Roman numeral, for the nameplate's volume line ("VOL. XII").
 * Module-private (page files can't export helpers); covered via the rendered
 * nameplate in page.test.tsx. */
function romanNumeral(n: number): string {
  const table: [number, string][] = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"],
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [value, glyph] of table) {
    while (n >= value) {
      out += glyph;
      n -= value;
    }
  }
  return out;
}

function BrowseLink({ href, icon, title, sub }: { href: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-lg border border-line bg-surface px-5 py-4 transition hover:-translate-y-0.5 hover:border-gold/55 hover:bg-surface-2"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line text-gold transition group-hover:border-gold">
        {icon}
      </span>
      <div className="flex-1">
        <div className="font-display text-lg text-ink group-hover:text-gold">{title}</div>
        <div className="text-sm text-muted">{sub}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-faint transition group-hover:translate-x-0.5 group-hover:text-gold" />
    </Link>
  );
}

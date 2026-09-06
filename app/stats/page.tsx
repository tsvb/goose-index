import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, MetaTable } from "@/app/_components/doc";
import { PageHead } from "@/app/_components/page-chrome";
import { SectionRule } from "@/app/_components/forms";
import { PenNote } from "@/app/_components/pen";
import { getExperience } from "@/lib/experience.server";
import {
  statsHubHighlights,
  catalogProfile,
  mostPlayed,
  rarities,
  currentGaps,
  debutsByYear,
  recentDebuts,
  setStats,
  OVERDUE_MIN_PLAYS,
  RARITY_MAX_PLAYS,
  type SongIndexRow,
} from "@/lib/queries/songs";
import { getOverviewStats } from "@/lib/queries/stats";
import { dayOfWeekJams, type DayOfWeekJamsRow } from "@/lib/queries/discoveries";
import { compact, formatShortDate, songHref } from "@/lib/queries/format";
import { etYear } from "@/lib/today";
import { CUTS, type CutMeta } from "./cuts";
import { CatalogProfile } from "./catalog-profile";
import { weekReading } from "./oracle/components/dow-dial";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Stats",
  description: "Goose by the numbers — most played, rarities, gaps, debuts, and set stats.",
  alternates: { canonical: canonicalUrl("/stats") },
};

/** How many lines each cut gets on the hub: enough to read, not enough to
 * replace the cut. */
const LINES = { mostPlayed: 5, rarities: 3, overdue: 3, debuts: 3 } as const;
/** The head bracket on the profile is the cut's own window — mostPlayed()'s
 * default limit, which cuts.ts also prints as "top 100". */
const MOST_PLAYED_TOP = 100;

const cut = (slug: string): CutMeta => CUTS.find((c) => c.slug === slug)!;

export default async function StatsHub() {
  const experience = await getExperience();

  if (experience === "minimal") {
    const hl = await statsHubHighlights();
    const songLine = (s: { name: string; slug: string } | null, rest: string) =>
      s ? <><Link href={`/songs/${s.slug}`}>{s.name}</Link> · {rest}</> : "—";
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Stats" }]} />
          <h1>Stats</h1>
          <MetaTable rows={[
            { k: "Most Played", v: songLine(hl.mostPlayed, `${hl.mostPlayed?.plays ?? 0} plays`) },
            { k: "Rarities", v: `${hl.raritiesCount} ${hl.raritiesCount === 1 ? "song qualifies" : "songs qualify"}` },
            { k: "Most Overdue", v: songLine(hl.mostOverdue, `${hl.mostOverdue?.gap ?? 0} shows since last played`) },
            { k: "Debuts", v: songLine(hl.latestDebut, `debuted ${hl.latestDebut?.date ?? ""}`) },
            { k: "Set Stats", v: songLine(hl.topOpener, `opened ${hl.topOpener?.count ?? 0} shows`) },
          ]} />
          <ul>
            {CUTS.map((c) => (
              <li key={c.slug}>
                <Link href={`/stats/${c.slug}`}>{c.title}</Link> — {c.blurb}
              </li>
            ))}
          </ul>
        </Doc>
      </Container>
    );
  }

  // Fancy and functional share this body. Every line below is read from the
  // same queries the cut pages run, so the hub can never disagree with a cut.
  const [scope, profile, top, rare, gaps, byYear, recent, buckets, dow] = await Promise.all([
    getOverviewStats(),
    catalogProfile(),
    mostPlayed(LINES.mostPlayed),
    rarities(Number.MAX_SAFE_INTEGER),
    currentGaps(LINES.overdue),
    debutsByYear(),
    recentDebuts(LINES.debuts),
    setStats(),
    dayOfWeekJams(),
  ]);
  const thisYear = etYear();
  const firstYear = scope.firstDate ? scope.firstDate.slice(0, 4) : null;
  const meta = [
    `${compact(scope.showsPlayed)} shows`,
    `${compact(scope.performances)} songs played`,
    `${compact(scope.songs)} unique songs`,
    firstYear ? `since ${firstYear}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Container>
      <PageHead title="stats" meta={meta} />

      <CatalogProfile plays={profile.plays} topN={MOST_PLAYED_TOP} />

      <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
        <HubSection cut={cut("most-played")} linkLabel={`the top ${MOST_PLAYED_TOP} →`} seed="hub-most-played">
          <PlaysList rows={top} />
        </HubSection>

        <HubSection
          cut={cut("rarities")}
          linkLabel={`all ${compact(rare.length)} →`}
          seed="hub-rarities"
          note={`Played ${RARITY_MAX_PLAYS} times or fewer. A cover played once is a one-off, not a rarity, so it doesn't count.`}
        >
          <RaritiesList rows={rare} />
        </HubSection>

        <HubSection
          cut={cut("current-gaps")}
          linkLabel="the top 100 →"
          seed="hub-overdue"
          note={`Songs played ${OVERDUE_MIN_PLAYS} times or more. A full ring would be every one of the ${compact(profile.shows)} shows with a setlist.`}
        >
          <OverdueList rows={gaps} record={profile.shows} />
        </HubSection>

        <HubSection
          cut={cut("debuts")}
          linkLabel="the latest 25 →"
          seed="hub-debuts"
          note={debutsNote(byYear, thisYear)}
        >
          <DebutColumns data={byYear} thisYear={thisYear} />
          <DebutList rows={recent} />
        </HubSection>

        <HubSection cut={cut("set-stats")} linkLabel="the top 15 of each →" seed="hub-set-stats">
          <SetLeaders buckets={buckets} />
        </HubSection>

        <HubSection cut={cut("oracle")} linkLabel="all five readings →" seed="hub-oracle">
          <OracleReading dow={dow} />
        </HubSection>
      </div>
    </Container>
  );
}

/** One cut on the hub: the pen's section rule, what the cut is, its live
 * lines, and — where the numbers need it — the criteria in the pen's margin. */
function HubSection({
  cut,
  linkLabel,
  seed,
  note,
  children,
}: {
  cut: CutMeta;
  linkLabel: string;
  seed: string;
  note?: React.ReactNode;
  children: React.ReactNode;
}) {
  const href = `/stats/${cut.slug}`;
  return (
    // min-w-0: a grid item's automatic minimum is its content's min-content
    // width, and a nowrap venue line in the debuts list is wider than a
    // phone — without this the whole column grows to fit it and every
    // section runs off the right edge.
    <section className="min-w-0">
      <SectionRule
        seed={seed}
        title={
          <Link href={href} className="underline-offset-4 hover:underline">
            {cut.title.toLowerCase()}
          </Link>
        }
        href={href}
        linkLabel={linkLabel}
      />
      <p className="mt-2 text-[0.85rem] text-muted">{cut.blurb}</p>
      <div className="mt-3">{children}</div>
      {note && <PenNote className="mt-3">{note}</PenNote>}
    </section>
  );
}

function Nil({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.85rem] text-muted">{children} —</p>;
}

const songLink = "min-w-0 truncate text-ink underline-offset-4 hover:underline";
/** Name on the left, its qualifier on the right — stacked on a phone, where
 * the two would otherwise fight for one line. */
const twoLineRow = "flex flex-col gap-y-0.5 text-[0.85rem] sm:flex-row sm:items-baseline sm:justify-between sm:gap-x-3";

/** A count is a length: the top songs as bars, subject in steel on a soft field. */
function PlaysList({ rows }: { rows: SongIndexRow[] }) {
  if (rows.length === 0) return <Nil>No plays logged yet</Nil>;
  const most = Math.max(1, rows[0].timesPlayed);
  return (
    <ol className="space-y-1.5">
      {rows.map((r) => (
        <li key={r.songId} className="grid grid-cols-[minmax(0,10rem)_1fr_2.5rem] items-center gap-x-3 text-[0.85rem]">
          <Link href={songHref(r)} className={songLink}>
            {r.name}
          </Link>
          <span className="block h-[7px] bg-line-soft" aria-hidden="true">
            <span className="block h-full bg-steel" style={{ width: `${(r.timesPlayed / most) * 100}%` }} />
          </span>
          <span className="text-right font-mono text-[0.75rem] text-muted">{r.timesPlayed}</span>
        </li>
      ))}
    </ol>
  );
}

/** The count that is the cut, its split, and the rarities most recently back
 * on stage — a song with more than one play, by its last date. A one-play song
 * would only repeat the newest debut. */
function RaritiesList({ rows }: { rows: SongIndexRow[] }) {
  if (rows.length === 0) return <Nil>No rarities yet</Nil>;
  const originals = rows.filter((r) => r.isOriginal).length;
  const covers = rows.length - originals;
  const returns = rows
    .filter((r): r is SongIndexRow & { lastPlayedDate: string } => r.timesPlayed > 1 && r.lastPlayedDate != null)
    .sort((a, b) => (a.lastPlayedDate === b.lastPlayedDate ? a.name.localeCompare(b.name) : a.lastPlayedDate < b.lastPlayedDate ? 1 : -1))
    .slice(0, LINES.rarities);
  return (
    <>
      <p className="text-[0.85rem] text-ink">
        <b className="font-mono font-semibold">{compact(rows.length)}</b> {rows.length === 1 ? "song qualifies" : "songs qualify"}
        <span className="text-muted">
          {" "}· {originals} {originals === 1 ? "original" : "originals"}, {covers} {covers === 1 ? "cover" : "covers"}
        </span>
      </p>
      {returns.length > 0 && (
        <>
          <p className="mt-3 font-mono text-[0.62rem] lowercase text-faint">most recently back</p>
          <ol className="mt-1 space-y-1.5">
            {returns.map((r) => (
              <li key={r.songId} className={twoLineRow}>
                <span className="min-w-0 truncate">
                  <Link href={songHref(r)} className="text-ink underline-offset-4 hover:underline">
                    {r.name}
                  </Link>
                  {!r.isOriginal && <span className="ml-1.5 text-[0.6rem] uppercase tracking-wide text-faint">cover</span>}
                </span>
                <span className="shrink-0 font-mono text-[0.72rem] text-faint">
                  <span className="text-muted">{r.timesPlayed}×</span> · last {formatShortDate(r.lastPlayedDate)}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </>
  );
}

/** A gap is a closing ring: how much of the whole record has gone by since
 * the song was last played. Ember, because overdue is heat everywhere on the
 * site; the written count sits beside it so colour is never the only carrier. */
function GapRing({ fraction }: { fraction: number }) {
  const c = 8;
  const r = 6;
  const sweep = Math.min(0.995, Math.max(0.02, fraction)) * 360;
  const rad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const a = { x: c + Math.cos(rad(0)) * r, y: c + Math.sin(rad(0)) * r };
  const b = { x: c + Math.cos(rad(sweep)) * r, y: c + Math.sin(rad(sweep)) * r };
  const d = `M${a.x.toFixed(2)} ${a.y.toFixed(2)} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} className="shrink-0" aria-hidden="true">
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--line)" strokeWidth={1.5} />
      <path d={d} fill="none" stroke="var(--ember)" strokeWidth={1.5} />
    </svg>
  );
}

function OverdueList({ rows, record }: { rows: SongIndexRow[]; record: number }) {
  if (rows.length === 0) return <Nil>Nothing overdue</Nil>;
  return (
    <ol className="space-y-2">
      {rows.map((r) => {
        const gap = r.currentGap ?? 0;
        return (
          <li key={r.songId} className="flex items-center gap-3 text-[0.85rem]">
            <GapRing fraction={record > 0 ? gap / record : 0} />
            <Link href={songHref(r)} className={`flex-1 ${songLink}`}>
              {r.name}
            </Link>
            <span className="shrink-0 font-mono text-[0.75rem]">
              <span className="text-ember">{compact(gap)}</span> <span className="text-faint">shows</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Debuts per year as a row of columns. The running year is dashed — it has
 * fewer because it isn't over, and a column that didn't say so would be an
 * accusation (the same rule the career chart follows). */
function DebutColumns({ data, thisYear }: { data: { year: number; count: number }[]; thisYear: number }) {
  if (data.length === 0) return null;
  const most = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-1" role="group" aria-label="Debuts per year">
      {data.map((d) => {
        const partial = d.year === thisYear;
        const h = Math.max(2, Math.round((d.count / most) * 36));
        return (
          <span key={d.year} className="flex flex-1 flex-col items-center justify-end" title={`${d.year}: ${d.count} debuts`}>
            <span className="font-mono text-[0.55rem] leading-none text-faint">{d.count}</span>
            <span
              className="mt-0.5 block w-full"
              style={{
                height: h,
                background: partial ? "color-mix(in srgb, var(--steel) 22%, transparent)" : "var(--steel)",
                border: partial ? "1px dashed var(--steel)" : "none",
              }}
            />
            <span className="mt-1 font-mono text-[0.55rem] leading-none text-faint">{String(d.year).slice(2)}</span>
          </span>
        );
      })}
    </div>
  );
}

function debutsNote(byYear: { year: number; count: number }[], thisYear: number): string | null {
  const running = byYear.find((y) => y.year === thisYear);
  if (!running) return null;
  return `${running.count} so far in ${thisYear}; the dashed column is the year still running.`;
}

function DebutList({ rows }: { rows: { slug: string; name: string; date: string; venue: string | null }[] }) {
  if (rows.length === 0) return <Nil>No debuts logged yet</Nil>;
  return (
    <ol className="mt-3 space-y-1.5">
      {rows.map((d) => (
        <li key={d.slug} className={twoLineRow}>
          <Link href={songHref(d)} className={`${songLink} sm:max-w-[55%] sm:shrink-0`}>
            {d.name}
          </Link>
          <span className="min-w-0 truncate font-mono text-[0.72rem] text-faint">
            {formatShortDate(d.date)}
            {d.venue ? ` · ${d.venue}` : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The leader of each bucket: the song that has opened, opened set two, or
 * encored the most shows. */
function SetLeaders({ buckets }: { buckets: { key: string; label: string; rows: { slug: string; name: string; count: number }[] }[] }) {
  if (buckets.length === 0) return <Nil>No sets logged yet</Nil>;
  return (
    <ol className="space-y-1.5">
      {buckets.map((b) => {
        const lead = b.rows[0];
        return (
          <li key={b.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 text-[0.85rem]">
            <span className="font-mono text-[0.68rem] lowercase text-faint">{b.label}</span>
            {lead ? (
              <>
                <Link href={songHref(lead)} className={songLink}>
                  {lead.name}
                </Link>
                <span className="font-mono text-[0.75rem] text-muted">
                  {compact(lead.count)} <span className="text-faint">shows</span>
                </span>
              </>
            ) : (
              <span className="text-muted">—</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** The dial's headline reading in one sentence, evidence attached — the same
 * numbers the dial draws, from the same helper. */
function OracleReading({ dow }: { dow: DayOfWeekJamsRow[] }) {
  const w = weekReading(dow);
  const shows = (n: number) => `${n} ${n === 1 ? "show" : "shows"}`;
  return (
    <>
      <p className="text-[0.85rem] leading-relaxed text-ink">
        <span className="text-muted">Which night runs hottest?</span>{" "}
        {w ? (
          <>
            <span className="text-ember">{w.hottest.dayName}</span>: {w.hottest.avgJams.toFixed(2)} jams a show,{" "}
            {w.hottest.avgJams - w.mean >= 0 ? "+" : "−"}
            {Math.abs(w.hottest.avgJams - w.mean).toFixed(2)} on the week&apos;s mean of {w.mean.toFixed(2)}
            {w.bestEvidenced.dow === w.hottest.dow
              ? ` — and on ${shows(w.hottest.totalShows)}, the best-evidenced night of the week.`
              : ` — but on ${shows(w.hottest.totalShows)}, against ${w.bestEvidenced.totalShows} on a ${w.bestEvidenced.dayName}.`}
          </>
        ) : (
          "No jam charts read yet."
        )}
      </p>
      <p className="mt-2 text-[0.8rem] text-muted">
        Then the segue lines, the shelf, the deepest venues, and the coach&apos;s own notes.
      </p>
    </>
  );
}

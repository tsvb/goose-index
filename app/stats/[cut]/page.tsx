import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { SongIndexTable, PlaysPerYearChart } from "@/app/_components/song";
import { CUTS, type CutMeta } from "../cuts";
import {
  mostPlayed,
  rarities,
  currentGaps,
  debutsByYear,
  recentDebuts,
  setStats,
  type SongIndexRow,
  type SongSort,
} from "@/lib/queries/songs";
import { getExperience } from "@/lib/experience.server";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ cut: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { cut } = await params;
  const meta = CUTS.find((c) => c.slug === cut);
  return meta
    ? { title: `${meta.title} · Stats`, description: meta.blurb }
    : { title: "Stats" };
}

function yearsFor(rows: SongIndexRow[]): number[] {
  const n = rows[0]?.playsPerYear.length ?? 0;
  const hi = new Date().getUTCFullYear();
  return Array.from({ length: n }, (_, i) => hi - (n - 1) + i);
}

/** The /songs URL that reproduces a cut's ordering over the whole catalog. */
function songsSortHref(key: SongSort): string {
  return key === "played" ? "/songs" : `/songs?sort=${key}`;
}

function CutSwitcher({ active }: { active: string }) {
  return (
    <nav aria-label="Stats cuts" className="mb-5 flex flex-wrap items-center gap-1.5 font-mono text-xs">
      {CUTS.map((c) => (
        <Link
          key={c.slug}
          href={`/stats/${c.slug}`}
          aria-current={c.slug === active ? "page" : undefined}
          className={c.slug === active ? "rounded-full bg-gold/15 px-3 py-1 text-gold ring-1 ring-gold/40" : "rounded-full px-3 py-1 text-muted transition hover:text-ink"}
        >
          {c.title}
        </Link>
      ))}
    </nav>
  );
}

function StatsShell({ cut, children }: { cut: CutMeta; children: ReactNode }) {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-9">
          <span className="eyebrow">
            <Link href="/stats" className="hover:text-gold">
              Stats
            </Link>
          </span>
          <h1 className="mt-3 font-display text-[2.2rem] leading-none tracking-tight text-ink sm:text-4xl">
            {cut.title}
          </h1>
          <p className="mt-2 font-mono text-xs text-faint">{cut.blurb}</p>
        </Container>
      </header>
      <Container className="py-8">
        <CutSwitcher active={cut.slug} />
        {children}
        <p className="mt-8 border-t border-line pt-3 font-mono text-[0.68rem] text-faint">
          {cut.note}
          {cut.songsSort && (
            <> · <Link href={songsSortHref(cut.songsSort)} className="underline hover:text-gold">same sort, full catalog →</Link></>
          )}
        </p>
      </Container>
    </>
  );
}

export default async function StatsCut({ params }: Params) {
  const { cut } = await params;
  const meta = CUTS.find((c) => c.slug === cut);
  if (!meta) notFound();
  const experience = await getExperience();
  const minimal = experience === "minimal";
  const crumb = (
    <Breadcrumb
      trail={[
        { href: "/", label: minimal ? "Goose Index" : "Index" },
        { href: "/stats", label: "Stats" },
        { label: meta.title },
      ]}
    />
  );
  // Minimal's equivalents of the switcher row and methodology footnote.
  const cutRow = (
    <p className="doc-crumb">
      {CUTS.map((c, i) => (
        <span key={c.slug}>
          {i > 0 && " · "}
          {c.slug === cut ? <strong>{c.title}</strong> : <Link href={`/stats/${c.slug}`}>{c.title}</Link>}
        </span>
      ))}
    </p>
  );
  const noteRow = (
    <p className="doc-crumb">
      {meta.note}
      {meta.songsSort && <> · <Link href={songsSortHref(meta.songsSort)}>full catalog</Link></>}
    </p>
  );

  // Song-list cuts share one renderer.
  if (cut === "most-played" || cut === "rarities" || cut === "current-gaps") {
    const rows =
      cut === "most-played"
        ? await mostPlayed()
        : cut === "rarities"
          ? await rarities()
          : await currentGaps();
    if (minimal) {
      return (
        <Container className="py-8">
          <Doc>
            {crumb}
            <h1>{meta.title}</h1>
            {cutRow}
            <EntityTable
              rows={rows.map((r) => ({
                href: `/songs/${r.slug}`,
                name: r.name,
                sub: `${r.timesPlayed}×`,
                count:
                  cut === "current-gaps"
                    ? (r.currentGap ?? "—")
                    : r.timesPlayed,
              }))}
            />
            {noteRow}
          </Doc>
        </Container>
      );
    }
    return (
      <StatsShell cut={meta}>
        <SongIndexTable
          rows={rows}
          years={yearsFor(rows)}
          sort={meta.songsSort ? { active: meta.songsSort, hrefFor: songsSortHref } : undefined}
        />
      </StatsShell>
    );
  }

  if (cut === "debuts") {
    const [byYear, recent] = await Promise.all([debutsByYear(), recentDebuts()]);
    if (minimal) {
      return (
        <Container className="py-8">
          <Doc>
            {crumb}
            <h1>Debuts</h1>
            {cutRow}
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th className="num">Debuts</th>
                </tr>
              </thead>
              <tbody>
                {byYear.map((y) => (
                  <tr key={y.year}>
                    <td>{y.year}</td>
                    <td className="num">{y.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <h2 className="doc-h2">Recent debuts</h2>
            <EntityTable
              rows={recent.map((d) => ({
                href: `/songs/${d.slug}`,
                name: d.name,
                sub: `${d.date}${d.venue ? ` · ${d.venue}` : ""}`,
              }))}
            />
            {noteRow}
          </Doc>
        </Container>
      );
    }
    return (
      <StatsShell cut={meta}>
        <section>
          <h2 className="mb-2 font-display text-base text-ink">Debuts per year</h2>
          <PlaysPerYearChart data={byYear} label="Debuts per year" />
        </section>
        <section className="mt-8">
          <h2 className="mb-2 font-display text-base text-ink">
            Recent debuts <span className="font-mono text-xs text-faint">· latest {recent.length}</span>
          </h2>
          <ul className="mt-3 space-y-1 text-sm">
            {recent.map((d) => (
              <li key={d.slug} className="flex justify-between gap-3">
                <Link href={`/songs/${d.slug}`} className="text-ink hover:text-gold">
                  {d.name}
                </Link>
                <span className="text-faint">
                  {d.date}
                  {d.venue ? ` · ${d.venue}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </StatsShell>
    );
  }

  // set-stats
  const buckets = await setStats();
  if (minimal) {
    return (
      <Container className="py-8">
        <Doc>
          {crumb}
          <h1>Set Stats</h1>
          {cutRow}
          {buckets.map((b) => (
            <section key={b.key}>
              <h2 className="doc-h2">{b.label}</h2>
              <EntityTable
                rows={b.rows.map((r) => ({
                  href: `/songs/${r.slug}`,
                  name: r.name,
                  count: r.count,
                }))}
              />
            </section>
          ))}
          {noteRow}
        </Doc>
      </Container>
    );
  }
  return (
    <StatsShell cut={meta}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {buckets.map((b) => (
          <div key={b.key}>
            <h2 className="mb-2 font-display text-base text-ink">{b.label}</h2>
            <ul className="space-y-1 text-sm">
              {b.rows.map((r) => (
                <li key={r.slug} className="flex justify-between gap-3">
                  <Link href={`/songs/${r.slug}`} className="text-muted hover:text-ink">
                    {r.name}
                  </Link>
                  <span className="tabular-nums text-faint">{r.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </StatsShell>
  );
}

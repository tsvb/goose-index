import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { SongIndexTable, PlaysPerYearChart } from "@/app/_components/song";
import { CUTS } from "../cuts";
import { StatsShell, MinimalCutRow, MinimalNoteRow, songsSortHref } from "../_shell";
import {
  mostPlayed,
  rarities,
  currentGaps,
  debutsByYear,
  recentDebuts,
  setStats,
  type SongIndexRow,
} from "@/lib/queries/songs";
import { getExperience } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
type Params = { params: Promise<{ cut: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { cut } = await params;
  const meta = CUTS.find((c) => c.slug === cut);
  return meta
    ? { title: `${meta.title} · Stats`, description: meta.blurb, alternates: { canonical: canonicalUrl(`/stats/${cut}`) } }
    : { title: "Stats" };
}

function yearsFor(rows: SongIndexRow[]): number[] {
  const n = rows[0]?.playsPerYear.length ?? 0;
  const hi = new Date().getUTCFullYear();
  return Array.from({ length: n }, (_, i) => hi - (n - 1) + i);
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
  // Minimal's equivalents of the switcher row and methodology footnote —
  // shared with /stats/oracle via _shell so tweaks stay in one place.
  const cutRow = <MinimalCutRow active={cut} />;
  const noteRow = <MinimalNoteRow cut={meta} />;

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

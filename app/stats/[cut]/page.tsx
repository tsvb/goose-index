import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { SongIndexTable, PlaysPerYearChart } from "@/app/_components/song";
import { CUTS } from "../cuts";
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

function StatsShell({
  title,
  blurb,
  children,
}: {
  title: string;
  blurb: string;
  children: ReactNode;
}) {
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
            {title}
          </h1>
          <p className="mt-2 font-mono text-xs text-faint">{blurb}</p>
        </Container>
      </header>
      <Container className="py-8">{children}</Container>
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
          </Doc>
        </Container>
      );
    }
    return (
      <StatsShell title={meta.title} blurb={meta.blurb}>
        <SongIndexTable rows={rows} years={yearsFor(rows)} />
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
          </Doc>
        </Container>
      );
    }
    return (
      <StatsShell title="Debuts" blurb={meta.blurb}>
        <PlaysPerYearChart data={byYear} />
        <ul className="mt-6 space-y-1 text-sm">
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
        </Doc>
      </Container>
    );
  }
  return (
    <StatsShell title="Set Stats" blurb={meta.blurb}>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {buckets.map((b) => (
          <div key={b.key}>
            <h3 className="mb-2 font-display text-base text-ink">{b.label}</h3>
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

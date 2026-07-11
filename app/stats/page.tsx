import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, MetaTable } from "@/app/_components/doc";
import { getExperience } from "@/lib/experience.server";
import { statsHubHighlights, type StatsHubHighlights } from "@/lib/queries/songs";
import { compact, formatShortDate } from "@/lib/queries/format";
import { CUTS } from "./cuts";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Stats",
  description: "Goose by the numbers — most played, rarities, gaps, debuts, and set stats.",
  alternates: { canonical: canonicalUrl("/stats") },
};

/** Each cut's live headline — big figure + mono qualifier — keyed by cut slug. */
function hubLines(hl: StatsHubHighlights): Record<string, { big: string; small: string } | null> {
  return {
    "most-played": hl.mostPlayed && { big: hl.mostPlayed.name, small: `${compact(hl.mostPlayed.plays)} plays` },
    "rarities": { big: compact(hl.raritiesCount), small: hl.raritiesCount === 1 ? "song qualifies" : "songs qualify" },
    "current-gaps": hl.mostOverdue && { big: hl.mostOverdue.name, small: `${hl.mostOverdue.gap}-show gap` },
    "debuts": hl.latestDebut && { big: hl.latestDebut.name, small: `debuted ${formatShortDate(hl.latestDebut.date)}` },
    "set-stats": hl.topOpener && { big: hl.topOpener.name, small: `opened ${compact(hl.topOpener.count)} shows` },
  };
}

export default async function StatsHub() {
  const [experience, hl] = await Promise.all([getExperience(), statsHubHighlights()]);
  const lines = hubLines(hl);

  if (experience === "minimal") {
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
  return (
    <>
      <header className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-10 sm:py-12">
          <span className="eyebrow">By the numbers</span>
          <h1 className="mt-3 font-display text-[2.4rem] leading-none tracking-tight text-ink sm:text-5xl">
            Stats
          </h1>
        </Container>
      </header>
      <Container className="py-8">
        {/* Most Played spans two tracks so five cards fill the grid at every width. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CUTS.map((c) => {
            const line = lines[c.slug];
            const featured = c.slug === "most-played";
            return (
              <Link
                key={c.slug}
                href={`/stats/${c.slug}`}
                className={
                  "surface-card group flex flex-col p-5 transition hover:border-gold/55" +
                  (featured ? " sm:col-span-2" : "")
                }
              >
                <div className="font-display text-lg text-ink group-hover:text-gold">{c.title}</div>
                <p className="mt-1 text-sm text-muted">{c.blurb}</p>
                {line && (
                  <div className="mt-auto pt-4">
                    <div className="flex items-baseline gap-2 border-t border-line-soft pt-3">
                      <span
                        title={line.big}
                        className={"min-w-0 truncate font-display text-ink " + (featured ? "text-2xl" : "text-xl")}
                      >
                        {line.big}
                      </span>
                      <span className="shrink-0 font-mono text-[0.7rem] text-faint">{line.small}</span>
                    </div>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </Container>
    </>
  );
}

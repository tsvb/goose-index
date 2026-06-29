import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { getExperience } from "@/lib/experience.server";
import { CUTS } from "./cuts";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Stats",
  description: "Goose by the numbers — most played, rarities, gaps, debuts, and set stats.",
};

export default async function StatsHub() {
  const experience = await getExperience();
  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Stats" }]} />
          <h1>Stats</h1>
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CUTS.map((c) => (
            <Link
              key={c.slug}
              href={`/stats/${c.slug}`}
              className="surface-card group block p-5 transition hover:border-gold/55"
            >
              <div className="font-display text-lg text-ink group-hover:text-gold">{c.title}</div>
              <p className="mt-1 text-sm text-muted">{c.blurb}</p>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}

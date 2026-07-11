import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { listYears } from "@/lib/queries/dimensions";
import { compact } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Years",
  description: "Every year of Goose shows, from the first gig on the record to tonight.",
  alternates: { canonical: canonicalUrl("/years") },
};

export default async function YearsPage() {
  const years = await listYears();
  const experience = await getExperience();

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Years" }]} />
          <h1>Years</h1>
          <p className="doc-crumb">{years.length} {years.length === 1 ? "year" : "years"}</p>
          <EntityTable rows={years.map((y) => ({ href: `/years/${y.year}`, name: String(y.year), sub: `${compact(y.songs)} songs played`, count: y.shows }))} />
        </Doc>
      </Container>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="border-b border-line">
        <Container className="py-12 sm:py-16">
          <span className="eyebrow">Year by year</span>
          <h1 className="mt-3 font-display text-[2.4rem] leading-none tracking-tight text-ink sm:text-5xl">
            Years
          </h1>
          <p className="mt-3 font-mono text-xs text-faint">
            {years.length} {years.length === 1 ? "year" : "years"} on the record
          </p>
        </Container>
      </header>

      {/* List */}
      <Container className="py-10 sm:py-14">
        <div className="surface-card overflow-hidden">
          {years.map((y) => (
            <Link
              key={y.year}
              href={`/years/${y.year}`}
              className="group flex flex-col gap-1 border-b border-line-soft px-4 py-4 transition last:border-0 hover:bg-surface-2 sm:flex-row sm:items-baseline sm:gap-6"
            >
              <span className="flex-1 font-display text-lg text-ink transition group-hover:text-gold">
                {y.year}
              </span>
              <span className="font-mono text-xs text-faint">
                {compact(y.shows)} {y.shows === 1 ? "show" : "shows"} · {compact(y.songs)} songs played
              </span>
            </Link>
          ))}
        </div>
      </Container>
    </>
  );
}

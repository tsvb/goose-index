import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { listYears, careerYears } from "@/lib/queries/dimensions";
import { CareerChart } from "@/app/_components/career-chart";
import { PageHead } from "@/app/_components/page-chrome";
import { SectionRule, Ledger, ContentsRow } from "@/app/_components/forms";
import { compact } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Years",
  description: "Every year of Goose shows, from the first gig on the record to tonight.",
  alternates: { canonical: canonicalUrl("/years") },
};

export default async function YearsPage() {
  const [years, career] = await Promise.all([listYears(), careerYears()]);
  const experience = await getExperience();
  const coverage = new Map(career.map((c) => [c.year, c]));

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
    <Container>
      <PageHead
        kicker="year by year"
        title="years"
        meta={`${years.length} ${years.length === 1 ? "year" : "years"} on the record`}
      />

      <section className="mb-10">
        <SectionRule title="the shape of it" seed="years-shape" />
        <p className="mb-5 mt-1 font-mono text-xs text-faint">
          Thirteen years of shows. A list makes you plot this in your head.
        </p>
        <CareerChart years={career} />
      </section>

      {/* List */}
      <Ledger seed="years">
        {years.map((y) => {
          const c = coverage.get(y.year);
          const sub = `${compact(y.shows)} ${y.shows === 1 ? "show" : "shows"} · ${compact(y.songs)} songs played${
            c && c.documented < c.shows ? ` (setlists for ${c.documented})` : ""
          }`;
          return <ContentsRow key={y.year} href={`/years/${y.year}`} label={String(y.year)} sub={sub} />;
        })}
      </Ledger>
    </Container>
  );
}

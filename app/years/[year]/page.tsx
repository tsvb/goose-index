import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { Container } from "@/app/_components/container";
import { FolioNav } from "@/app/_components/page-chrome";
import { Ledger, LedgerEntry } from "@/app/_components/forms";
import { listShows } from "@/lib/queries/shows";
import { listYears } from "@/lib/queries/dimensions";
import { compact } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { Doc, Breadcrumb, ShowTable } from "@/app/_components/doc";
import { entityMetadata } from "@/lib/site";

type Params = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Params, parent: ResolvingMetadata): Promise<Metadata> {
  const { year } = await params;
  const description = `Every Goose show from ${year}, with full setlists.`;
  return { title: year, description, ...entityMetadata({ title: `${year} · Goose`, description, path: `/years/${year}`, parent: await parent }) };
}

export default async function YearPage({ params }: Params) {
  const { year: yearStr } = await params;
  const year = parseInt(yearStr, 10);

  if (!year || year < 2012 || year > 2030) {
    notFound();
  }

  const [{ rows, total }, years] = await Promise.all([
    listShows({ year, perPage: 400, dir: "asc" }),
    listYears(),
  ]);

  if (total === 0) notFound();

  const yearMeta = years.find((y) => y.year === year);
  const showCount = yearMeta?.shows ?? total;
  const songCount = yearMeta?.songs ?? 0;

  // Sorted desc by year (as returned by listYears), find prev/next that have shows
  const yearsWithShows = years.map((y) => y.year).sort((a, b) => a - b);
  const idx = yearsWithShows.indexOf(year);
  const prevYear = idx > 0 ? yearsWithShows[idx - 1] : null;
  const nextYear = idx < yearsWithShows.length - 1 ? yearsWithShows[idx + 1] : null;

  const experience = await getExperience();

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/years", label: "Years" }, { label: String(year) }]} />
          <h1>{year}</h1>
          <p className="doc-crumb">{rows.length} {rows.length === 1 ? "show" : "shows"}</p>
          <ShowTable shows={rows} />
        </Doc>
      </Container>
    );
  }

  return (
    <Container>
      {/* PageHead-style markup, written inline: the kicker carries a real
          years link (PageHead's own kicker is plain text only). The giant
          text-[7rem] year shrinks to PageHead's own h1 scale. */}
      <div className="pt-10 pb-6 sm:pt-14">
        <p className="text-[0.7rem] lowercase text-faint">
          <Link href="/years" className="text-spruce underline underline-offset-4 transition hover:text-ink">
            years
          </Link>
        </p>
        <h1 className="mt-1 text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
          {year}
        </h1>
        <p className="mt-2 font-mono text-[0.75rem] text-faint">
          <span className="text-ink">{compact(showCount)}</span> shows
          {" · "}
          <span className="text-ink">{compact(songCount)}</span> songs played
        </p>
      </div>

      <div className="mb-8">
        <FolioNav
          prevHref={prevYear ? `/years/${prevYear}` : undefined}
          nextHref={nextYear ? `/years/${nextYear}` : undefined}
          prevLabel={prevYear ? String(prevYear) : "previous"}
          nextLabel={nextYear ? String(nextYear) : "next"}
          center={
            <Link href="/years" className="lowercase text-spruce underline underline-offset-4 transition hover:text-ink">
              all years
            </Link>
          }
        />
      </div>

      {/* Show list */}
      <Ledger seed={`year-${year}`}>
        {rows.map((show) => (
          <LedgerEntry key={show.showId} show={show} />
        ))}
      </Ledger>
    </Container>
  );
}

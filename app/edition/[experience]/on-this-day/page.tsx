import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { PageHead } from "@/app/_components/page-chrome";
import { Ledger, LedgerEntry } from "@/app/_components/forms";
import { getOnThisDay } from "@/lib/queries/shows";
import { formatMonthDay, compact } from "@/lib/queries/format";
import { getExperience, type EditionProps } from "@/lib/experience.server";
import { Doc, Breadcrumb, ShowTable } from "@/app/_components/doc";
import { canonicalUrl } from "@/lib/site";

// Turns over at midnight ET, so the cached page lives five minutes rather
// than the layout's hour.
export const revalidate = 300;

export const metadata: Metadata = { title: "On This Day", alternates: { canonical: canonicalUrl("/on-this-day") } };

export default async function OnThisDayPage({ params }: EditionProps) {
  const rows = await getOnThisDay();

  const title = rows.length > 0 ? formatMonthDay(rows[0].date) : "On This Day";
  const experience = await getExperience(params);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "On This Day" }]} />
          <h1>On This Day</h1>
          {rows.length === 0 ? <p>No Goose shows on today&apos;s date.</p> : <ShowTable shows={rows} />}
        </Doc>
      </Container>
    );
  }

  return (
    <Container>
      <PageHead
        kicker="on this day"
        title={title}
        meta={
          rows.length > 0
            ? `Goose has played ${compact(rows.length)} ${rows.length === 1 ? "show" : "shows"} on this date over the years.`
            : undefined
        }
      />

      {rows.length === 0 ? (
        <p className="py-12 text-center font-mono text-sm text-faint">
          No Goose shows fall on today&apos;s date — yet.
        </p>
      ) : (
        <Ledger seed="on-this-day">
          {rows.map((show) => (
            <LedgerEntry key={show.showId} show={show} />
          ))}
        </Ledger>
      )}
    </Container>
  );
}

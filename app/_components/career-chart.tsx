import Link from "next/link";
import type { CareerYear } from "@/lib/queries/dimensions";

/**
 * The career, drawn as a series.
 *
 * A list of thirteen rows makes you plot the band's history in your head. As a
 * chart it's simply there: the climb to 2017, the pandemic year, the modern
 * plateau.
 *
 * The bar is split, and that's the point. elgoose has 107 shows logged for 2017
 * and setlists for 37 of them, so the page has been printing "107 shows · 343
 * songs played" side by side — inviting you to read 343 songs across 107 shows,
 * when the two numbers describe different sets of shows. The undocumented shows
 * are drawn hatched: "this happened and we know nothing else about it" is a fact
 * about the archive, and hiding it would let the chart lie by omission.
 *
 * The current year is dashed. It has fewer shows because it isn't over, not
 * because the band slowed down, and a bar that didn't say so would be an
 * accusation.
 */
/** `label` reserves room above the tallest bar — without it the value sits on
 * top of whatever prose precedes the chart. */
const CHART = { h: 168, min: 3, label: 18 } as const;

export function CareerChart({ years }: { years: CareerYear[] }) {
  if (years.length === 0) return null;
  const most = Math.max(...years.map((y) => y.shows));
  const peak = years.reduce((a, b) => (!b.partial && b.shows > a.shows ? b : a), years[0]);
  const anyGaps = years.some((y) => y.documented < y.shows);

  return (
    <figure className="m-0">
      <div className="flex items-end gap-1.5" style={{ height: CHART.h + CHART.label }}>
        {years.map((y) => {
          const h = Math.max((y.shows / most) * CHART.h, CHART.min);
          const covered = y.shows === 0 ? 0 : (y.documented / y.shows) * h;
          const missing = h - covered;
          const isPeak = y.year === peak.year;
          return (
            <Link
              key={y.year}
              href={`/years/${y.year}`}
              title={`${y.year} — ${y.shows} shows${y.documented < y.shows ? `, setlists for ${y.documented}` : ""}, ${y.uniqueSongs} different songs, ${y.debuts} debuts${y.partial ? " (year still running)" : ""}`}
              className="group flex flex-1 flex-col justify-end"
            >
              <span className="mb-1 text-center font-mono text-[0.6rem] tabular-nums text-faint transition group-hover:text-ink">
                {y.shows}
              </span>
              <span className="relative block w-full" style={{ height: h }}>
                {/* Shows we know happened, and nothing else. Hatched, not hidden. */}
                {missing > 0 && (
                  <span
                    className="absolute inset-x-0 top-0 block"
                    style={{
                      height: missing,
                      background:
                        "repeating-linear-gradient(135deg, var(--line) 0 2px, transparent 2px 5px)",
                      border: "1px solid var(--line)",
                      borderBottom: "none",
                    }}
                  />
                )}
                {/* Shows with a setlist. */}
                <span
                  className="absolute inset-x-0 bottom-0 block transition"
                  style={{
                    height: covered,
                    background: y.partial
                      ? "color-mix(in srgb, var(--gold) 22%, transparent)"
                      : isPeak
                        ? "var(--ember)"
                        : "var(--gold)",
                    opacity: y.partial ? 1 : 0.85,
                    border: y.partial ? "1px dashed var(--gold)" : "none",
                  }}
                />
              </span>
              <span
                className={`mt-1.5 text-center font-mono text-[0.6rem] tabular-nums transition ${
                  isPeak ? "text-ember" : "text-faint group-hover:text-ink"
                }`}
              >
                {String(y.year).slice(2)}
              </span>
            </Link>
          );
        })}
      </div>

      <figcaption className="mt-4 max-w-3xl font-mono text-[0.62rem] leading-relaxed text-faint">
        Shows per year. <span className="text-ember">{peak.year}</span> is the busiest the band has ever been —{" "}
        {peak.shows} shows.
        {anyGaps && (
          <>
            {" "}
            The hatched part of a bar is shows elgoose has logged but has <em className="not-italic text-muted">no
            setlist for</em> — 2017 has {years.find((y) => y.year === 2017)?.shows ?? 0} shows and setlists for{" "}
            {years.find((y) => y.year === 2017)?.documented ?? 0}. The early record is thin, and that is a fact about
            the archive rather than about the band.
          </>
        )}{" "}
        The final bar is dashed because the year is still running.
      </figcaption>
    </figure>
  );
}

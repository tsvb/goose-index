import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Search } from "@/app/_components/marks";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { listVenues, showsByState, showsByCountry, type VenueRow } from "@/lib/queries/dimensions";
import { VenueMap, VenueMapTable } from "@/app/_components/venue-map";
import { locationLine, compact } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Venues",
  description: "Every venue Goose has played, grouped by state and filterable by name or city.",
  alternates: { canonical: canonicalUrl("/venues") },
};

type SearchParams = { sort?: "shows" | "name"; q?: string };

type VenueGroup = { id: string; label: string; kind: "state" | "country" | "other"; rows: VenueRow[] };
const KIND_ORDER = { state: 0, country: 1, other: 2 } as const;

/** US venues group under their state, everywhere else under the country, unlocated last. */
function groupVenues(rows: VenueRow[]): VenueGroup[] {
  const groups = new Map<string, VenueGroup>();
  for (const v of rows) {
    const intl = Boolean(v.country && v.country !== "USA");
    const kind: VenueGroup["kind"] = intl ? "country" : v.state ? "state" : "other";
    const label = kind === "country" ? v.country! : kind === "state" ? v.state! : "Unlisted";
    const id = `g-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    let g = groups.get(id);
    if (!g) groups.set(id, (g = { id, label, kind, rows: [] }));
    g.rows.push(v);
  }
  return [...groups.values()].sort(
    (a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.label.localeCompare(b.label),
  );
}

// Sort links and the filter form preserve each other (mirrors /songs).
function buildHref(sp: { sort: string; q: string }) {
  const u = new URLSearchParams();
  if (sp.sort === "name") u.set("sort", "name");
  if (sp.q) u.set("q", sp.q);
  const qs = u.toString();
  return qs ? `/venues?${qs}` : "/venues";
}

export default async function VenuesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { sort = "shows", q = "" } = await searchParams;
  const [venues, states, countries] = await Promise.all([
    listVenues({ sort, q }),
    showsByState(),
    showsByCountry(),
  ]);
  const experience = await getExperience();
  const groups = groupVenues(venues);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Venues" }]} />
          <h1>Venues</h1>
          <p className="doc-crumb">
            {venues.length} venues{q ? ` matching “${q}”` : ""} · grouped by state
          </p>
          <form action="/venues" method="get">
            {sort === "name" && <input type="hidden" name="sort" value="name" />}
            <label>
              Filter by name, city, or state: <input name="q" defaultValue={q} />
            </label>{" "}
            <button type="submit">Filter</button>
          </form>
          {groups.length > 1 && (
            <p className="doc-crumb">
              {groups.map((g, i) => (
                <span key={g.id}>
                  {i > 0 && " · "}
                  <a href={`#${g.id}`}>{g.label}</a>
                </span>
              ))}
            </p>
          )}
          {venues.length === 0 && <p>No venues match{q ? ` “${q}”` : ""}.</p>}
          {groups.map((g) => (
            <section key={g.id} id={g.id}>
              <h2 className="doc-h2">{g.label}</h2>
              <EntityTable rows={g.rows.map((v) => ({
                href: `/venues/${v.venueId}`,
                name: v.name,
                sub: locationLine(v.city, g.kind === "state" ? null : v.state, null),
                count: v.shows,
              }))} />
            </section>
          ))}
        </Doc>
      </Container>
    );
  }

  const stickyTop = experience === "functional" ? "top-12" : "top-16";

  return (
    <>
      {/* Hero */}
      <header className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-12 sm:py-16">
          <span className="eyebrow rise" style={{ animationDelay: "0ms" }}>
            Where Goose plays
          </span>
          <h1
            className="rise mt-4 font-display text-[2.6rem] leading-none tracking-tight text-ink sm:text-5xl"
            style={{ animationDelay: "60ms" }}
          >
            Venues
          </h1>
          <p
            className="rise mt-2 font-mono text-xs text-faint"
            style={{ animationDelay: "120ms" }}
          >
            {venues.length} venues{q ? ` · matching “${q}”` : ""}
          </p>
        </Container>
      </header>

      {!q && (
        <Container className="pt-10">
          <section>
            <h2 className="mb-1 font-display text-base text-ink">Where they play</h2>
            <p className="mb-4 font-mono text-xs text-faint">
              Every show, by state. The map is the answer to &ldquo;where&rdquo;; the ledger below is the answer to
              &ldquo;which room&rdquo;.
            </p>
            <VenueMap states={states} countries={countries} />
            <VenueMapTable states={states} />
          </section>
        </Container>
      )}

      {/* Sort + filter + grouped ledger */}
      <Container className="py-10">
        {/* Sort toggle (orders venues inside each state group) */}
        <div className="mb-4 flex items-center gap-1 font-mono text-xs">
          <Link
            href={buildHref({ sort: "shows", q })}
            className={
              sort !== "name"
                ? "rounded px-2.5 py-1 text-gold ring-1 ring-gold/40 bg-gold/10"
                : "rounded px-2.5 py-1 text-muted hover:text-ink transition"
            }
          >
            Most shows
          </Link>
          <Link
            href={buildHref({ sort: "name", q })}
            className={
              sort === "name"
                ? "rounded px-2.5 py-1 text-gold ring-1 ring-gold/40 bg-gold/10"
                : "rounded px-2.5 py-1 text-muted hover:text-ink transition"
            }
          >
            A–Z
          </Link>
        </div>

        {/* Name/city/state filter — a GET form, like /songs?q= */}
        {experience === "functional" ? (
          <form action="/venues" method="get" className="mb-4 flex items-center gap-2">
            {sort === "name" && <input type="hidden" name="sort" value="name" />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Filter by name, city, or state…"
              aria-label="Filter venues by name, city, or state"
              className="w-64 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-faint outline-none focus:border-gold"
            />
            <button type="submit" className="gel text-xs">Filter</button>
          </form>
        ) : (
          <form action="/venues" method="get" className="group relative mb-4 max-w-xs">
            {sort === "name" && <input type="hidden" name="sort" value="name" />}
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition group-focus-within:text-gold" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Filter by name, city, or state…"
              aria-label="Filter venues by name, city, or state"
              className="w-full rounded-full border border-line bg-surface/60 py-2 pl-8 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:border-gold"
            />
          </form>
        )}

        {/* State/country jump row */}
        {groups.length > 1 && (
          <nav aria-label="Jump to state" className="mb-6 flex flex-wrap gap-1 font-mono text-xs">
            {groups.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className="rounded px-2 py-0.5 text-muted transition hover:bg-surface hover:text-gold"
              >
                {g.label}
              </a>
            ))}
          </nav>
        )}

        {venues.length === 0 ? (
          <p className="font-mono text-sm text-faint">
            No venues match{q ? ` “${q}”` : ""}.{" "}
            <Link href="/venues" className="underline hover:text-gold">Clear the filter</Link>
          </p>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.id} id={g.id} className="scroll-mt-20">
                <h2
                  className={`sticky ${stickyTop} z-10 border-b border-line bg-bg/90 py-2 font-mono text-xs uppercase tracking-[0.18em] text-gold-soft backdrop-blur-sm`}
                >
                  {g.label}{" "}
                  <span className="tracking-normal text-faint">
                    · {g.rows.length} {g.rows.length === 1 ? "venue" : "venues"}
                  </span>
                </h2>
                <div className="surface-card mt-2 grid px-2 sm:grid-cols-2 sm:gap-x-6 sm:px-3">
                  {g.rows.map((v) => {
                    const sub = locationLine(v.city, g.kind === "state" ? null : v.state, null);
                    return (
                      <Link
                        key={v.venueId}
                        href={`/venues/${v.venueId}`}
                        className="group grid grid-cols-[1fr_auto] items-baseline gap-3 border-b border-line-soft px-1 py-2.5 transition last:border-0 hover:bg-surface-2"
                      >
                        <div className="min-w-0 truncate">
                          <span className="font-display text-[0.95rem] text-ink transition group-hover:text-gold">
                            {v.name}
                          </span>
                          {sub && <span className="ml-2 text-sm text-muted">{sub}</span>}
                        </div>
                        <div className="shrink-0 text-right font-mono text-[0.68rem] text-faint">
                          <span className="text-ink">{compact(v.shows)}</span>{" "}
                          {v.shows === 1 ? "show" : "shows"}
                          {v.capacity != null && v.capacity > 0 && (
                            <>
                              {" · "}cap.{" "}
                              <span className="text-ink">{compact(v.capacity)}</span>
                            </>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

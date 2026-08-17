import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Search } from "@/app/_components/marks";
import { Doc, Breadcrumb, EntityTable } from "@/app/_components/doc";
import { listVenues, showsByState, showsByCountry, normalizeCountry, type VenueRow } from "@/lib/queries/dimensions";
import { VenueMap, VenueMapTable } from "@/app/_components/venue-map";
import { PageHead, FilterLink, FilterRow, NilState, chromeLink } from "@/app/_components/page-chrome";
import { SectionRule, Ledger } from "@/app/_components/forms";
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

/** US venues group under their state, everywhere else under the country, unlocated last.
 *
 * The country name is normalised first: elgoose's field is free text, so "UK" and
 * "United Kingdom" arrive as different strings and the ledger listed the same
 * country twice. Both this and the map now fold names through one rule. */
function groupVenues(rows: VenueRow[]): VenueGroup[] {
  const groups = new Map<string, VenueGroup>();
  for (const v of rows) {
    const country = v.country ? normalizeCountry(v.country) : null;
    const intl = Boolean(country && country !== "USA");
    const kind: VenueGroup["kind"] = intl ? "country" : v.state ? "state" : "other";
    const label = kind === "country" ? country! : kind === "state" ? v.state! : "Unlisted";
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

  // Fancy's sticky offset matches the real masthead height (h-14 + PenRule);
  // functional's shorter w2 appbar uses its own h-12.
  const stickyTop = experience === "functional" ? "top-12" : "top-[calc(3.5rem_+_6px)]";

  return (
    <Container>
      <PageHead
        kicker="where goose plays"
        title="venues"
        meta={`${venues.length} venues${q ? ` · matching “${q}”` : ""}`}
      />

      {!q && (
        <section className="mb-10">
          <SectionRule title="where they play" seed="venues-map" />
          <p className="mb-4 mt-1 font-mono text-xs text-faint">
            Every show, by state. The map is the answer to &ldquo;where&rdquo;; the ledger below is the answer to
            &ldquo;which room&rdquo;.
          </p>
          <VenueMap states={states} countries={countries} />
          <VenueMapTable states={states} />
        </section>
      )}

      <div className="flex flex-col gap-3">
        {/* Sort toggle (orders venues inside each state group) */}
        <FilterRow>
          <FilterLink href={buildHref({ sort: "shows", q })} active={sort !== "name"}>
            Most shows
          </FilterLink>
          <FilterLink href={buildHref({ sort: "name", q })} active={sort === "name"}>
            A–Z
          </FilterLink>
        </FilterRow>

        {/* Name/city/state filter — a GET form, like /songs?q= */}
        {experience === "functional" ? (
          <form action="/venues" method="get" className="flex items-center gap-2">
            {sort === "name" && <input type="hidden" name="sort" value="name" />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Filter by name, city, or state…"
              aria-label="Filter venues by name, city, or state"
              className="w-64 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-faint outline-none focus:border-[#1f6cb0]"
            />
            <button type="submit" className="gel text-xs">Filter</button>
          </form>
        ) : (
          <form action="/venues" method="get" className="group relative max-w-xs">
            {sort === "name" && <input type="hidden" name="sort" value="name" />}
            <Search className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition group-focus-within:text-steel" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Filter by name, city, or state…"
              aria-label="Filter venues by name, city, or state"
              className="w-full rounded-none border-0 border-b border-line bg-transparent py-1.5 pl-6 pr-2 text-sm text-ink placeholder:text-faint outline-none transition focus:border-steel"
            />
          </form>
        )}

        {/* State/country jump row */}
        {groups.length > 1 && (
          <nav aria-label="Jump to state" className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs">
            {groups.map((g) => (
              <a
                key={g.id}
                href={`#${g.id}`}
                className={chromeLink}
              >
                {g.label}
              </a>
            ))}
          </nav>
        )}
      </div>

      <div className="mt-8">
        {venues.length === 0 ? (
          <NilState href="/venues" linkLabel="clear the filter">
            No venues match{q ? ` “${q}”` : ""}.
          </NilState>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.id} id={g.id} className="scroll-mt-24">
                <div className={`sticky ${stickyTop} z-10 bg-paper py-2`}>
                  <SectionRule
                    title={
                      <>
                        {g.label}{" "}
                        <span className="text-faint">
                          · {g.rows.length} {g.rows.length === 1 ? "venue" : "venues"}
                        </span>
                      </>
                    }
                    seed={`venues-${g.id}`}
                  />
                </div>
                <Ledger seed={`venues-${g.id}`}>
                  {g.rows.map((v) => {
                    const sub = locationLine(v.city, g.kind === "state" ? null : v.state, null);
                    return (
                      <Link
                        key={v.venueId}
                        href={`/venues/${v.venueId}`}
                        className="group flex items-baseline justify-between gap-4 py-2.5"
                      >
                        <span className="min-w-0 truncate">
                          <span className="text-ink underline-offset-4 group-hover:underline">{v.name}</span>
                          {sub && <span className="ml-2 text-[0.85rem] text-muted">{sub}</span>}
                        </span>
                        <span className="shrink-0 text-right font-mono text-[0.68rem] text-faint">
                          <span className="text-ink">{compact(v.shows)}</span>{" "}
                          {v.shows === 1 ? "show" : "shows"}
                          {v.capacity != null && v.capacity > 0 && (
                            <>
                              {" · "}cap.{" "}
                              <span className="text-ink">{compact(v.capacity)}</span>
                            </>
                          )}
                        </span>
                      </Link>
                    );
                  })}
                </Ledger>
              </section>
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}

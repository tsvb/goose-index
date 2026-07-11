import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { SongIndexTable } from "@/app/_components/song";
import { ArrowLeft, ArrowRight, Search } from "@/app/_components/marks";
import { listSongs, OVERDUE_MIN_PLAYS, type SongSort, type SongFacet } from "@/lib/queries/songs";
import { compact } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Songs", description: "Every Goose song, sortable by plays, rarity, gap, and debut." };

const SORTS: { key: SongSort; label: string }[] = [
  { key: "played", label: "Most played" }, { key: "rare", label: "Rarest" },
  { key: "overdue", label: "Most overdue" }, { key: "rotation", label: "Rotation" },
  { key: "recent", label: "Recently played" }, { key: "debut", label: "By debut" }, { key: "az", label: "A–Z" },
];

// /songs?sort=overdue is the same cut as /stats/current-gaps — say so on both pages.
const OVERDUE_NOTE = `Most overdue = songs played ≥${OVERDUE_MIN_PLAYS} times, ranked by shows since last played — the same cut as `;
const FACETS: { key: SongFacet; label: string }[] = [
  { key: "all", label: "All" }, { key: "originals", label: "Originals" }, { key: "covers", label: "Covers" },
];

// 613 songs × ~11 sparkline elements each is a multi-megabyte page — window it.
const PER_PAGE = 100;

type SP = { sort?: SongSort; facet?: SongFacet; q?: string; page?: string };

export default async function SongsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const { sort = "played", facet = "all", q = "", page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "", 10) || 1);
  const { rows, total } = await listSongs({ sort, facet, q, page, perPage: PER_PAGE });
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const experience = await getExperience();

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Songs" }]} />
          <h1>Songs</h1>
          <p className="doc-crumb">{compact(total)} songs · sorted by {SORTS.find((s) => s.key === sort)?.label}</p>
          <p className="doc-crumb">
            {SORTS.map((s) => <span key={s.key}>{s.key === sort ? <strong>{s.label}</strong> : <Link href={buildHref({ sort: s.key, facet, q })}>{s.label}</Link>}{" · "}</span>)}
          </p>
          {sort === "overdue" && (
            <p className="doc-crumb">{OVERDUE_NOTE}<Link href="/stats/current-gaps">Most Overdue</Link> in Stats.</p>
          )}
          <form action="/songs" method="get">
            <FilterParams sort={sort} facet={facet} />
            <label>
              Name filter: <input name="q" defaultValue={q} />
            </label>{" "}
            <button type="submit">Filter</button>
          </form>
          <table className="doc-table">
            <thead><tr><th>Song</th><th className="num">Played</th><th className="num">Gap</th><th>Last</th><th>Debut</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.songId}>
                  <td><Link href={`/songs/${r.slug}`}>{r.name}</Link>{!r.isOriginal ? " (cover)" : ""}</td>
                  <td className="num">{r.timesPlayed}</td><td className="num">{r.currentGap ?? "—"}</td>
                  <td>{r.lastPlayedDate ?? "—"}</td><td>{r.debutYear ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalPages > 1 && (
            <p className="doc-crumb">
              {page > 1 ? <Link href={buildHref({ sort, facet, q, page: page - 1 })}>← Previous</Link> : null}
              {" "}Page {page} of {totalPages}{" "}
              {page < totalPages ? <Link href={buildHref({ sort, facet, q, page: page + 1 })}>Next →</Link> : null}
            </p>
          )}
        </Doc>
      </Container>
    );
  }

  // Fancy + Functional share this dense body.
  const yearsForTable = rows[0] ? deriveYears(rows) : [];
  return (
    <>
      <header className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-10 sm:py-12">
          <span className="eyebrow">The catalog</span>
          <h1 className="mt-3 font-display text-[2.4rem] leading-none tracking-tight text-ink sm:text-5xl">Songs</h1>
          <p className="mt-2 font-mono text-xs text-faint">{compact(total)} songs · sort the whole catalog any way you like</p>
        </Container>
      </header>
      <Container className="py-8">
        <div className="mb-3 flex flex-wrap items-center gap-1.5 font-mono text-xs">
          {SORTS.map((s) => (
            <Link key={s.key} href={buildHref({ sort: s.key, facet, q })}
              className={s.key === sort ? "rounded-full bg-gold/15 px-3 py-1 text-gold ring-1 ring-gold/40" : "rounded-full px-3 py-1 text-muted transition hover:text-ink"}>
              {s.label}
            </Link>
          ))}
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-1.5 font-mono text-[0.7rem] text-faint">
          Filter:
          {FACETS.map((f) => (
            <Link key={f.key} href={buildHref({ sort, facet: f.key, q })}
              className={f.key === facet ? "rounded-full px-2.5 py-0.5 text-gold ring-1 ring-gold/40" : "rounded-full px-2.5 py-0.5 text-muted transition hover:text-ink"}>
              {f.label}
            </Link>
          ))}
        </div>
        {experience === "functional" ? (
          <form action="/songs" method="get" className="mb-4 flex items-center gap-2">
            <FilterParams sort={sort} facet={facet} />
            <input
              name="q"
              defaultValue={q}
              placeholder="Filter by song name…"
              aria-label="Filter songs by name"
              className="w-56 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-ink placeholder:text-faint outline-none focus:border-gold"
            />
            <button type="submit" className="gel text-xs">Filter</button>
          </form>
        ) : (
          <form action="/songs" method="get" className="group relative mb-4 max-w-xs">
            <FilterParams sort={sort} facet={facet} />
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition group-focus-within:text-gold" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Filter by song name…"
              aria-label="Filter songs by name"
              className="w-full rounded-full border border-line bg-surface/60 py-2 pl-8 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:border-gold"
            />
          </form>
        )}
        {sort === "overdue" && (
          <p className="mb-3 font-mono text-[0.7rem] text-faint">
            {OVERDUE_NOTE}<Link href="/stats/current-gaps" className="underline hover:text-gold">Most Overdue</Link> in Stats.
          </p>
        )}
        <SongIndexTable rows={rows} years={yearsForTable} rankOffset={(page - 1) * PER_PAGE} sort={{ active: sort, hrefFor: (key) => buildHref({ sort: key, facet, q }) }} />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between gap-4">
            <div>
              {page > 1 ? (
                <Link
                  href={buildHref({ sort, facet, q, page: page - 1 })}
                  className="group flex items-center gap-1.5 rounded border border-line px-4 py-2 font-mono text-sm text-muted transition hover:border-gold hover:text-gold"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
                  Previous
                </Link>
              ) : (
                <span aria-disabled="true" className="flex items-center gap-1.5 rounded border border-line px-4 py-2 font-mono text-sm text-faint opacity-40 select-none">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Previous
                </span>
              )}
            </div>

            <span className="font-mono text-xs text-faint">
              Page {compact(page)} of {compact(totalPages)}
            </span>

            <div>
              {page < totalPages ? (
                <Link
                  href={buildHref({ sort, facet, q, page: page + 1 })}
                  className="group flex items-center gap-1.5 rounded border border-line px-4 py-2 font-mono text-sm text-muted transition hover:border-gold hover:text-gold"
                >
                  Next
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                </Link>
              ) : (
                <span aria-disabled="true" className="flex items-center gap-1.5 rounded border border-line px-4 py-2 font-mono text-sm text-faint opacity-40 select-none">
                  Next
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>
        )}
      </Container>
    </>
  );
}

// Carry the active sort/facet through the name-filter form (mirrors buildHref's
// omit-the-defaults behavior) so filtering doesn't reset them.
function FilterParams({ sort, facet }: { sort: SongSort; facet: SongFacet }) {
  return (
    <>
      {sort !== "played" && <input type="hidden" name="sort" value={sort} />}
      {facet !== "all" && <input type="hidden" name="facet" value={facet} />}
    </>
  );
}

// Sort/facet/header links never pass `page`, so re-cutting the list always
// lands back on page 1; only the pager itself carries the page along.
function buildHref(sp: { sort: string; facet: string; q: string; page?: number }) {
  const u = new URLSearchParams();
  if (sp.sort !== "played") u.set("sort", sp.sort);
  if (sp.facet !== "all") u.set("facet", sp.facet);
  if (sp.q) u.set("q", sp.q);
  if (sp.page != null && sp.page > 1) u.set("page", String(sp.page));
  const qs = u.toString();
  return qs ? `/songs?${qs}` : "/songs";
}
// The index rows carry counts aligned to the band's year span; recover labels from the first row length.
function deriveYears(rows: { playsPerYear: number[] }[]): number[] {
  const n = rows[0].playsPerYear.length;
  const hi = new Date().getUTCFullYear();
  return Array.from({ length: n }, (_, i) => hi - (n - 1) + i);
}

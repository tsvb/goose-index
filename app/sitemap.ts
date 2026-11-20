import type { MetadataRoute } from "next";
import { allShowDates, allSongSlugs, allYears, allTourIds, allVenueIds, catalogLastmod, type Dated } from "@/lib/queries/sitemap";
import { listPosts } from "@/lib/blog/posts";
import { CUTS } from "./edition/[experience]/stats/cuts";
import { SITE_URL } from "@/lib/site";

// Rendered per request, not prerendered at build. Every read below goes through
// cachedQuery (lib/queries/sitemap.ts), so a crawler's fetch hits the Data Cache
// and opens no connection until the hourly TTL lapses — the cost is the same as
// ISR. What changes is the build: as ISR the sitemap was the one page `next
// build` rendered against the database, so a full connection pooler failed the
// deploy (three preview builds on 2026-11-19, EMAXCONNSESSION). Now a build
// opens no database connection at all, except the production migration step.
export const dynamic = "force-dynamic";

// <lastmod> is set only where the data says when a page's content last moved
// (see lastmodOf in lib/queries/sitemap.ts). /on-this-day changes every day
// and /listen-links only when code ships, so they carry none rather than a
// date nobody can stand behind.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [dates, slugs, years, tourIds, venueIds, catalog] = await Promise.all([
    allShowDates(),
    allSongSlugs(),
    allYears(),
    allTourIds(),
    allVenueIds(),
    catalogLastmod(),
  ]);
  const posts = listPosts();
  const page = (path: string, lastmod?: string) => ({
    url: `${SITE_URL}${path}`,
    ...(lastmod ? { lastModified: lastmod } : {}),
  });
  const each = <K>(prefix: string, rows: Dated<K>[]) => rows.map((r) => page(`${prefix}/${r.key}`, r.lastmod));
  return [
    page("", catalog),
    ...["/shows", "/songs", "/stats", "/tours", "/venues", "/years"].map((p) => page(p, catalog)),
    page("/on-this-day"),
    page("/blog", posts[0]?.date),
    page("/listen-links"),
    ...CUTS.map((c) => page(`/stats/${c.slug}`, catalog)),
    ...posts.map((p) => page(`/blog/${p.slug}`, p.date)),
    ...each("/years", years),
    ...each("/tours", tourIds),
    ...each("/venues", venueIds),
    ...each("/shows", dates),
    ...each("/songs", slugs),
  ];
}

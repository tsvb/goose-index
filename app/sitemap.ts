import type { MetadataRoute } from "next";
import { allShowDates, allSongSlugs, allYears, allTourIds, allVenueIds, catalogLastmod, type Dated } from "@/lib/queries/sitemap";
import { listPosts } from "@/lib/blog/posts";
import { CUTS } from "./stats/cuts";
import { SITE_URL } from "@/lib/site";

// The URL set only changes when the nightly sync writes new shows/songs.
// ISR here so crawlers don't open five Neon connections on every fetch.
export const revalidate = 3600;

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

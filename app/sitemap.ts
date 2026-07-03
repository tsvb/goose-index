import type { MetadataRoute } from "next";
import { allShowDates, allSongSlugs } from "@/lib/queries/sitemap";
import { CUTS } from "./stats/cuts";
import { SITE_URL } from "@/lib/site";

// Reads live DB data like every page; regenerate per request.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [dates, slugs] = await Promise.all([allShowDates(), allSongSlugs()]);
  const page = (path: string) => ({ url: `${SITE_URL}${path}` });
  return [
    page(""),
    ...["/shows", "/songs", "/stats", "/tours", "/venues", "/on-this-day"].map(page),
    ...CUTS.map((c) => page(`/stats/${c.slug}`)),
    ...dates.map((d) => page(`/shows/${d}`)),
    ...slugs.map((s) => page(`/songs/${s}`)),
  ];
}

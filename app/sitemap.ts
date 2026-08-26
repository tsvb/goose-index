import type { MetadataRoute } from "next";
import { allShowDates, allSongSlugs, allYears, allTourIds, allVenueIds } from "@/lib/queries/sitemap";
import { allPostSlugs } from "@/lib/blog/posts";
import { CUTS } from "./stats/cuts";
import { SITE_URL } from "@/lib/site";

// The URL set only changes when the nightly sync writes new shows/songs.
// ISR here so crawlers don't open five Neon connections on every fetch.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [dates, slugs, years, tourIds, venueIds] = await Promise.all([
    allShowDates(),
    allSongSlugs(),
    allYears(),
    allTourIds(),
    allVenueIds(),
  ]);
  const page = (path: string) => ({ url: `${SITE_URL}${path}` });
  return [
    page(""),
    ...["/shows", "/songs", "/stats", "/tours", "/venues", "/years", "/on-this-day", "/blog", "/listen-links"].map(page),
    ...CUTS.map((c) => page(`/stats/${c.slug}`)),
    ...allPostSlugs().map((s) => page(`/blog/${s}`)),
    ...years.map((y) => page(`/years/${y}`)),
    ...tourIds.map((id) => page(`/tours/${id}`)),
    ...venueIds.map((id) => page(`/venues/${id}`)),
    ...dates.map((d) => page(`/shows/${d}`)),
    ...slugs.map((s) => page(`/songs/${s}`)),
  ];
}

import type { MetadataRoute } from "next";
import { allShowDates, allSongSlugs, allYears, allTourIds, allVenueIds, allBoardSlugs } from "@/lib/queries/sitemap";
import { CUTS } from "./stats/cuts";
import { SITE_URL } from "@/lib/site";

// Reads live DB data like every page; regenerate per request.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [dates, slugs, years, tourIds, venueIds, boardSlugs] = await Promise.all([
    allShowDates(),
    allSongSlugs(),
    allYears(),
    allTourIds(),
    allVenueIds(),
    allBoardSlugs(),
  ]);
  const page = (path: string) => ({ url: `${SITE_URL}${path}` });
  return [
    page(""),
    ...["/shows", "/songs", "/stats", "/tours", "/venues", "/years", "/on-this-day"].map(page),
    ...CUTS.map((c) => page(`/stats/${c.slug}`)),
    ...years.map((y) => page(`/years/${y}`)),
    ...tourIds.map((id) => page(`/tours/${id}`)),
    ...venueIds.map((id) => page(`/venues/${id}`)),
    ...dates.map((d) => page(`/shows/${d}`)),
    ...slugs.map((s) => page(`/songs/${s}`)),
    page("/forum"),
    ...boardSlugs.map((s) => page(`/forum/${s}`)),
  ];
}

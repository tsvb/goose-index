import type { Metadata } from "next";
import { getExperience } from "@/lib/experience.server";
import { getRecentShows, getShowDetails, getSetlist, getNugsCoverage } from "@/lib/queries/shows";
import { ListenLinksContent, type ListenExample } from "@/app/_components/listen-links";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "How the listen links work",
  alternates: { canonical: canonicalUrl("/listen-links") },
};

export default async function ListenLinksPage() {
  const experience = await getExperience();

  // The live example: the most recent past show, and one real song title.
  // Every URL is then built by the same helpers the buttons call. An empty
  // database renders the explanation with the try-it block omitted.
  const [recent] = await getRecentShows(1);
  let example: ListenExample | null = null;
  if (recent) {
    const details = await getShowDetails(recent.date);
    // Two-show days: pick the row for THIS show so venue and container stay aligned.
    const show = details.find((d) => d.showId === recent.showId) ?? details[0] ?? null;
    if (show) {
      const setlist = await getSetlist(show.showId);
      example = {
        date: show.date,
        venue: show.venue,
        containerId: show.nugsContainerId,
        song: setlist[0]?.song ?? null,
      };
    }
  }

  const coverage = await getNugsCoverage();
  return <ListenLinksContent experience={experience} example={example} coverage={coverage} />;
}

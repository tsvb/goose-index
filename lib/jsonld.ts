import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";
import type { PostMeta } from "@/lib/blog/posts";
import { locationLine } from "@/lib/queries/format";
import { canonicalUrl } from "@/lib/site";

export function showJsonLd(show: ShowDetail, setlist: SetlistEntry[]): object {
  const address = locationLine(show.city, show.state, show.country);
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `Goose at ${show.venue ?? "an unknown venue"}`,
    startDate: show.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    ...(show.venue
      ? {
          location: {
            "@type": "MusicVenue",
            name: show.venue,
            ...(address ? { address } : {}),
          },
        }
      : {}),
    performer: { "@type": "MusicGroup", name: "Goose" },
    workPerformed: setlist.map((e) => ({ "@type": "MusicComposition", name: e.song })),
  };
}

export function blogPostingJsonLd(post: PostMeta): object {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.summary,
    datePublished: post.date,
    url: canonicalUrl(`/blog/${post.slug}`),
    author: { "@type": "Organization", name: "Goose Index" },
    ...(post.tags.length ? { keywords: post.tags.join(", ") } : {}),
  };
}

export function siteJsonLd(): object {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Goose Index",
    description: "A complete index of every Goose show: setlists, venues, tours, and stats.",
    about: { "@type": "MusicGroup", name: "Goose" },
  };
}

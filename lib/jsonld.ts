import type { ShowDetail, SetlistEntry } from "@/lib/queries/shows";
import type { PostMeta } from "@/lib/blog/posts";
import { locationLine, showDescription, showHref } from "@/lib/queries/format";
import { canonicalUrl } from "@/lib/site";

export function showJsonLd(show: ShowDetail, setlist: SetlistEntry[]): object {
  const address = locationLine(show.city, show.state, show.country);
  return {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `Goose at ${show.venue ?? "an unknown venue"}`,
    // The page URL, matching the canonical link (?n= only past the first show
    // of a multi-show date).
    url: canonicalUrl(showHref(show.date, show.order)),
    description: showDescription(show, setlist.length > 0),
    // The site's shared card — there is no per-show image.
    image: canonicalUrl("/opengraph-image"),
    // Date-only, like the source: a show is filed under the night it started,
    // and no start or end time is logged.
    startDate: show.date,
    endDate: show.date,
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

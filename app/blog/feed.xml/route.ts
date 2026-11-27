// RSS 2.0, hand-assembled like everything else in the blog engine. Feed
// readers get the summary as the description and the full rendered post as
// content:encoded, so subscribing is not a teaser mill. Everything passes
// through escapeHtml (a superset of XML's escaping needs).

import { listPosts } from "@/lib/blog/posts";
import { blocksToHtml, escapeHtml } from "@/lib/blog/html";
import { canonicalUrl } from "@/lib/site";
import { ymd } from "@/lib/queries/format";

// Built once per deploy. Posts live in the repo (content/blog), so the feed can
// only change when code ships; reading the directory on every request (as this
// did) spent a function run per feed-reader poll to say the same thing.
export const dynamic = "force-static";

/** RFC 822 date at UTC midnight — the post date is a calendar date, no time. */
function pubDate(date: string): string {
  const { y, m, d } = ymd(date);
  return new Date(Date.UTC(y, m - 1, d)).toUTCString();
}

export async function GET(): Promise<Response> {
  const posts = listPosts();
  const items = posts
    .map((p) => {
      const url = canonicalUrl(`/blog/${p.slug}`);
      return [
        "    <item>",
        `      <title>${escapeHtml(p.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <pubDate>${pubDate(p.date)}</pubDate>`,
        `      <description>${escapeHtml(p.summary)}</description>`,
        `      <content:encoded>${escapeHtml(blocksToHtml(p.body))}</content:encoded>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">`,
    "  <channel>",
    "    <title>Goose Index — Blog</title>",
    `    <link>${canonicalUrl("/blog")}</link>`,
    `    <atom:link href="${canonicalUrl("/blog/feed.xml")}" rel="self" type="application/rss+xml"/>`,
    "    <description>Notes from building and running the Goose Index.</description>",
    "    <language>en</language>",
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");

  return new Response(xml, {
    headers: { "content-type": "application/rss+xml; charset=utf-8" },
  });
}

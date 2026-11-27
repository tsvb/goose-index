import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * What crawlers may fetch. Besides /api/, this keeps them off the pages that
 * render on every request because they read a query string: /search, and the
 * browse pages' filter and sort combinations. A crawler walking every
 * `?year=&tour=&dir=&per=&page=` (or inventing `?q=`) costs a function run and
 * a database round trip per URL, and none of those URLs is canonical — each
 * page's canonical is the bare path, which stays allowed (and cached; see
 * lib/edition-route.ts), as do every show, song and venue in the sitemap.
 *
 * Robots rules match by prefix, so `/shows?` takes `/shows?year=2024` and
 * leaves `/shows/2024-06-01?n=2` (a second show's canonical URL) alone.
 */
const DISALLOW = ["/api/", "/search", "/shows?", "/songs?", "/venues?"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: DISALLOW },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

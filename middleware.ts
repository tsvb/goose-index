import { NextResponse, type NextRequest } from "next/server";
import { EXPERIENCE_COOKIE, editionRoute } from "@/lib/edition-route";

// Picks the edition from the ga_experience cookie and rewrites the request to
// /edition/<experience>/<path>, so pages never read the cookie themselves and
// can be cached (see lib/edition-route.ts). The browser's URL doesn't change.
export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const route = editionRoute(url.pathname, url.searchParams, req.cookies.get(EXPERIENCE_COOKIE)?.value, new Date());
  url.pathname = route.pathname;
  for (const key of route.drop) url.searchParams.delete(key);
  return NextResponse.rewrite(url);
}

export const config = {
  // Pages only. Route handlers, Next's assets, the generated metadata images
  // and anything with a file extension (sitemap.xml, robots.txt,
  // blog/feed.xml) are served as they are. /edition/… is matched on purpose:
  // it gets prefixed again and 404s, so it is never a public entry point.
  matcher: ["/((?!api/|_next/|apple-icon|opengraph-image|.*\\.[a-zA-Z0-9]+$).*)"],
};

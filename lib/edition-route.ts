import { EXPERIENCE_COOKIE, resolveExperience } from "./experience";
import { liveCandidateDate } from "./live";

/**
 * Where proxy.ts sends a page request.
 *
 * Every page lives under app/edition/[experience]/, so each edition (3.0, 2.0,
 * 1.0) of each page is its own cached entry and nothing has to read the
 * ga_experience cookie at render time. Pure, so it is tested without Next.
 *
 * Three public URLs carry a query string that picks *which* page to render.
 * A page that reads searchParams can't be cached, so those move into the path:
 *   /songs/<slug>?page=N  ->  /songs/<slug>/p/N     (N >= 2)
 *   /shows/<date>?n=N     ->  /shows/<date>/n/N     (N >= 2)
 * and tonight's show, inside the live window (lib/live.ts), goes to the
 * live route, cached on a much shorter clock than the plain one:
 *   /shows/<date>         ->  /shows/<date>/live
 *   /shows/<date>?n=N     ->  /shows/<date>/live/n/N   (N >= 2)
 *
 * The browse pages (/shows, /songs, /venues) still read their query string, so
 * they render per request. Without any parameter the page reads — the nav
 * links, and most visitors — the answer is always the same, so those go to a
 * cached copy. Other parameters (utm_*, fbclid, Vercel's _vercel_share) don't
 * change the page, so they don't cost a render:
 *   /shows                ->  /shows/_all             (same for /songs, /venues)
 * `_all` is a real route folder (`%5Fall`, Next's escape for a leading
 * underscore). A public URL with a `_` segment is sent to a path no route
 * matches, so `/shows/_all` is never a second public address for /shows.
 */
export const EDITION_PREFIX = "/edition";

const SHOW = /^\/shows\/(\d{4}-\d{2}-\d{2})\/?$/;
const SONG = /^\/songs\/([^/]+)\/?$/;
const WHOLE = /^\d{1,4}$/;
const BROWSE = /^\/(shows|songs|venues)\/?$/;

/**
 * The query keys each browse page reads (its searchParams type). Keep these in
 * step with the pages: a key missing here would serve the unfiltered copy for
 * a filtered URL.
 */
export const BROWSE_KEYS: Record<string, readonly string[]> = {
  shows: ["year", "tour", "dir", "per", "page"],
  songs: ["sort", "facet", "q", "page"],
  venues: ["sort", "q"],
};
const PRIVATE_SEGMENT = /(^|\/)_/;

/** Where an internal-only public path goes: [...missing] renders the 404. */
export const MISSING_SEGMENT = "_missing";

export type EditionRoute = { pathname: string; drop: string[] };

export function editionRoute(
  pathname: string,
  query: URLSearchParams,
  cookie: string | undefined,
  now: Date,
): EditionRoute {
  const base = `${EDITION_PREFIX}/${resolveExperience(cookie)}`;

  if (PRIVATE_SEGMENT.test(pathname)) return { pathname: `${base}/${MISSING_SEGMENT}`, drop: [] };

  const browse = BROWSE.exec(pathname);
  if (browse && !BROWSE_KEYS[browse[1]].some((k) => query.has(k))) return { pathname: `${base}/${browse[1]}/_all`, drop: [] };

  const show = SHOW.exec(pathname);
  if (show) {
    const date = show[1];
    const n = query.get("n");
    const nth = n && WHOLE.test(n) && Number(n) > 1 ? `/n/${Number(n)}` : "";
    const live = liveCandidateDate(now) === date ? "/live" : "";
    return { pathname: `${base}/shows/${date}${live}${nth}`, drop: ["n"] };
  }

  const song = SONG.exec(pathname);
  if (song) {
    const page = query.get("page");
    if (page && WHOLE.test(page) && Number(page) > 1) return { pathname: `${base}/songs/${song[1]}/p/${Number(page)}`, drop: ["page"] };
    return { pathname: `${base}/songs/${song[1]}`, drop: ["page"] };
  }

  return { pathname: pathname === "/" ? base : `${base}${pathname}`, drop: [] };
}

export { EXPERIENCE_COOKIE };

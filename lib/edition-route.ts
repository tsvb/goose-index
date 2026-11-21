import { EXPERIENCE_COOKIE, resolveExperience } from "./experience";
import { liveCandidateDate } from "./live";

/**
 * Where middleware.ts sends a page request.
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
 * per-request live route instead of the cached one:
 *   /shows/<date>         ->  /shows/<date>/live    (keeps ?n=)
 */
export const EDITION_PREFIX = "/edition";

const SHOW = /^\/shows\/(\d{4}-\d{2}-\d{2})\/?$/;
const SONG = /^\/songs\/([^/]+)\/?$/;
const WHOLE = /^\d{1,4}$/;

export type EditionRoute = { pathname: string; drop: string[] };

export function editionRoute(
  pathname: string,
  query: URLSearchParams,
  cookie: string | undefined,
  now: Date,
): EditionRoute {
  const base = `${EDITION_PREFIX}/${resolveExperience(cookie)}`;

  const show = SHOW.exec(pathname);
  if (show) {
    const date = show[1];
    if (liveCandidateDate(now) === date) return { pathname: `${base}/shows/${date}/live`, drop: [] };
    const n = query.get("n");
    if (n && WHOLE.test(n) && Number(n) > 1) return { pathname: `${base}/shows/${date}/n/${Number(n)}`, drop: ["n"] };
    return { pathname: `${base}/shows/${date}`, drop: ["n"] };
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

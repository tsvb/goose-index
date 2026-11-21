import { resolveExperience, type Experience } from "./experience";

/**
 * The edition a page renders comes from the URL, not from the cookie.
 *
 * `proxy.ts` reads the `ga_experience` cookie and rewrites each request to
 * `/edition/<experience>/<path>`, so the edition arrives as the `[experience]`
 * route param. Reading `cookies()` here instead would be a Dynamic API: every
 * page would render on every request (crawlers included) and nothing could be
 * cached, which is what spent the free plan's Fluid Active CPU in Nov 2026.
 */
export type EditionParams = { experience?: string };

/** Props for a page whose only route param is the edition. */
export type EditionProps = { params?: Promise<EditionParams> };

export async function getExperience(params?: Promise<EditionParams> | EditionParams): Promise<Experience> {
  return resolveExperience((await params)?.experience);
}

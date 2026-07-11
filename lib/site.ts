import type { ResolvedMetadata } from "next";

/** Canonical public origin — live 2026-07-03. Vercel's primary domain is the
    www host (apex 307s to it), so canonical/sitemap URLs use www to avoid a
    redirect hop on every crawl. */
export const SITE_URL = "https://www.gooseindex.com";

/** Absolute URL for a given site path. Path must start with "/". */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** Canonical link + Open Graph for an entity page. Spread into Metadata:
 *    return { title, description, ...entityMetadata({...}) };
 *
 * `path` is the CANONICAL path — pathname plus only the query params that
 * distinguish content (e.g. `?n=2` for a specific show on a multi-show day).
 * Never include filter, sort, or pagination params.
 *
 * Page-level `openGraph` replaces the root object wholesale (dropping
 * site_name/type/url and the file-convention og:image), so we rebuild the
 * shared fields and re-attach the parent's images. `alternates.canonical`
 * is set to the same URL — Google treats og:url and rel=canonical
 * independently, so both must be declared. */
export function entityMetadata(opts: {
  title: string;
  description: string;
  path: string;
  parent: ResolvedMetadata;
}) {
  const url = canonicalUrl(opts.path);
  return {
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      siteName: "Goose Index",
      type: "website" as const,
      url,
      images: opts.parent.openGraph?.images,
    },
  };
}

import type { ResolvedMetadata } from "next";

/** Canonical public origin — live 2026-07-03. Vercel's primary domain is the
    www host (apex 307s to it), so canonical/sitemap URLs use www to avoid a
    redirect hop on every crawl. */
export const SITE_URL = "https://www.gooseindex.com";

/** Page-level `openGraph` replaces the root object wholesale (dropping
    site_name/type/url and the file-convention og:image), so entity pages
    rebuild the shared fields here and re-attach the parent's images. */
export function entityOpenGraph(opts: {
  title: string;
  description: string;
  path: string;
  parent: ResolvedMetadata;
}) {
  return {
    title: opts.title,
    description: opts.description,
    siteName: "Goose Index",
    type: "website" as const,
    url: `${SITE_URL}${opts.path}`,
    images: opts.parent.openGraph?.images,
  };
}

import NextLink from "next/link";
import type { ComponentProps } from "react";

/**
 * next/link with prefetching off unless a caller asks for it.
 *
 * Next prefetches every <Link> that scrolls into view. Each prefetch is a
 * request through proxy.ts, and one to a page that renders per request is a
 * server render nobody may ever look at — a song index or a venue list fired
 * hundreds per page view. Pages here are cached HTML, so a click that fetches
 * on the spot is still quick.
 *
 * Use this everywhere. The site nav (site-header, mobile-nav, nav-links) keeps
 * next/link's default: a handful of links, on every page, to the places people
 * go next.
 */
export default function Link(props: ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}

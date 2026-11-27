import type { Metadata, ResolvingMetadata } from "next";
import { ShowPage, generateShowMetadata, type ShowParams } from "../show-page";

// Tonight's show while it could be on stage (lib/live.ts: 3pm–4am ET).
// proxy.ts sends that one date here (and a second show to live/n/<n>);
// every other show is on the plain cached route.
//
// Cached too, on a short clock. Every open tab re-renders this page every 75s
// (LiveRefresh); rendered per request, that was one function run per tab per
// tick. Now the tabs share one render: each live sync busts this date's tags
// (lib/queries/cache.ts, revalidateLiveShow), so a new song still lands on the
// first request after the pull, and the 60s below only bounds a page whose
// sync didn't bust it.
export const revalidate = 60;

// No paths at build (a build opens no database connection).
export function generateStaticParams() {
  return [];
}

type Props = { params: Promise<ShowParams> };

export function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  return generateShowMetadata(props, parent);
}

export default function Page({ params }: Props) {
  return ShowPage({ params, live: true });
}

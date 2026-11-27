import type { Metadata } from "next";
import type { EditionParams } from "@/lib/experience.server";
import ShowsBrowsePage, { generateMetadata as browseMetadata } from "../page";

// Public `/shows` with no filter in its query, rewritten here by proxy.ts (see
// lib/edition-route.ts). The browse page reads searchParams, so it renders on
// every request; without a filter its answer never varies, so this copy is cached.
//
// Five minutes, as on Home: the page offers a jump to "tonight's show", which
// turns on the ET date, not only on the data the syncs bust.
export const revalidate = 300;

const NO_QUERY = Promise.resolve({});

export function generateMetadata(): Promise<Metadata> {
  return browseMetadata({ searchParams: NO_QUERY });
}

export default function Page({ params }: { params: Promise<EditionParams> }) {
  return ShowsBrowsePage({ params, searchParams: NO_QUERY });
}

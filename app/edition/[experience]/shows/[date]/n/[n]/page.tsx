import type { Metadata, ResolvingMetadata } from "next";
import { ShowPage, generateShowMetadata, type ShowParams } from "../../show-page";

// No paths at build (a build opens no database connection). Each one renders
// on its first visit and is then cached; see the edition layout's revalidate.
export function generateStaticParams() {
  return [];
}

// The second (third…) show on a multi-show date: public `/shows/<date>?n=2`,
// rewritten here by proxy.ts so the page can be cached like the first.
type Props = { params: Promise<ShowParams> };

export function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  return generateShowMetadata(props, parent);
}

export default function Page(props: Props) {
  return ShowPage(props);
}

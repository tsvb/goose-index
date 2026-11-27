import type { Metadata, ResolvingMetadata } from "next";
import { ShowPage, generateShowMetadata, type ShowParams } from "../../../show-page";

// The second (third…) show on tonight's date: public `/shows/<date>?n=2`
// inside the live window, rewritten here by proxy.ts so the page can be
// cached like the first (see ../../page.tsx for why, and for the 60s).
export const revalidate = 60;

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

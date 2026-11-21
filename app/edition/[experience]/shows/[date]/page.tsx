import type { Metadata, ResolvingMetadata } from "next";
import { ShowPage, generateShowMetadata, type ShowParams } from "./show-page";

// No paths at build (a build opens no database connection). Each one renders
// on its first visit and is then cached; see the edition layout's revalidate.
export function generateStaticParams() {
  return [];
}

// Cached (ISR, revalidate from the edition layout). Tonight's show inside the
// live window goes to live/page.tsx instead — see middleware.ts.
type Props = { params: Promise<ShowParams> };

export function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  return generateShowMetadata(props, parent);
}

export default function Page(props: Props) {
  return ShowPage(props);
}

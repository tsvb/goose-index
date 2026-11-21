import type { Metadata, ResolvingMetadata } from "next";
import { ShowPage, generateShowMetadata, type ShowParams } from "../show-page";

// Tonight's show while it could be on stage (lib/live.ts: 3pm–4am ET).
// middleware.ts sends that one date here; every other show is cached. This
// route renders per request, as the whole site used to, so the setlist the
// live loop re-renders is the pull that just finished.
export const dynamic = "force-dynamic";

type Props = { params: Promise<ShowParams>; searchParams: Promise<{ n?: string }> };

async function withN({ params, searchParams }: Props): Promise<{ params: Promise<ShowParams>; live: true }> {
  const [p, sp] = await Promise.all([params, searchParams]);
  return { params: Promise.resolve({ ...p, n: sp.n }), live: true };
}

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  return generateShowMetadata(await withN(props), parent);
}

export default async function Page(props: Props) {
  return ShowPage(await withN(props));
}

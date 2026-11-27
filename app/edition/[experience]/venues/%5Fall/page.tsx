import type { EditionParams } from "@/lib/experience.server";
import VenuesPage, { metadata as browseMetadata } from "../page";

// Public `/venues` with no query string, rewritten here by proxy.ts (see
// lib/edition-route.ts). The browse page reads searchParams, so it renders on
// every request; with no query its answer never varies, so this copy is cached
// (ISR, revalidate from the edition layout).
export const metadata = browseMetadata;

export default function Page({ params }: { params: Promise<EditionParams> }) {
  return VenuesPage({ params, searchParams: Promise.resolve({}) });
}

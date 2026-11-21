import type { Metadata, Viewport } from "next";
import "@/app/globals.css";
import { EditionShell } from "@/app/_components/edition-shell";
import { getExperience, type EditionParams } from "@/lib/experience.server";
import { EXPERIENCES } from "@/lib/experience";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Goose Index — every show, every night", template: "%s · Goose Index" },
  description:
    "A complete index of every Goose show: full setlists with segues and jams, venues, tours, and the story of each night. Data from elgoose.net.",
  // og:image comes from app/opengraph-image.tsx (file convention) — don't
  // declare `images` here or it would override the generated card.
  openGraph: {
    type: "website",
    siteName: "Goose Index",
    url: SITE_URL,
    title: "Goose Index — every show, every night",
    description:
      "A complete index of every Goose show: full setlists with segues and jams, venues, tours, and the story of each night. Data from elgoose.net.",
  },
  twitter: { card: "summary_large_image" },
};

// The browser's own chrome matches 3.0's night. 2.0 and 1.0 have never set a
// theme color, and still don't.
export async function generateViewport({ params }: { params: Promise<EditionParams> }): Promise<Viewport> {
  const experience = await getExperience(params);
  return experience === "fancy" ? { themeColor: "#0F1424" } : {};
}

// Pages are cached HTML (ISR). The edition used to come from the
// ga_experience cookie, a Dynamic API, so every page rendered on every request
// — crawlers included — and that spent the free plan's Fluid Active CPU.
// middleware.ts now reads the cookie and rewrites to /edition/<experience>/…,
// so each edition of each page is its own cached entry.
//
// An hour, the same as the catalog's Data Cache TTL (lib/queries/cache.ts).
// The nightly sync and the live-show sync bust their tags, so new data still
// shows up at once; the hour only bounds clock-driven copy ("tonight", "this
// year") on pages that set no shorter revalidate of their own.
export const revalidate = 3600;

// Nothing is rendered at build (a build still opens no database connection);
// each page renders on its first visit and is cached from then on.
export function generateStaticParams(): EditionParams[] {
  return [];
}

// No webfont in any edition. 3.0 asks for the system's rounded face
// (`ui-rounded`, which Safari has) and falls back to the platform's own UI
// face (globals.css, --type-display); 2.0 and 1.0 keep their period stacks.
// A build never downloads a font, and a page never waits for one.

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<EditionParams>;
}) {
  // Only middleware should reach /edition/…; a hand-typed key that isn't an
  // edition is a 404, not a fourth copy of every page in the cache.
  const key = (await params).experience;
  if (!EXPERIENCES.some((e) => e.key === key)) notFound();
  const experience = await getExperience(params);
  return <EditionShell experience={experience}>{children}</EditionShell>;
}

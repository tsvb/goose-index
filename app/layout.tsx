import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";
import { SkipLink } from "./_components/skip-link";
import { getExperience } from "@/lib/experience.server";
import { JsonLd } from "./_components/json-ld";
import { siteJsonLd } from "@/lib/jsonld";
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
export async function generateViewport(): Promise<Viewport> {
  const experience = await getExperience();
  return experience === "fancy" ? { themeColor: "#0F1424" } : {};
}

// Pages read live DB data and `etToday()` (e.g. "On This Day"), and the
// experience cookie is a Dynamic API, so HTML still renders per request.
// Catalog queries are cached in lib/queries/cache.ts — that's what keeps
// Neon from waking on every crawler hit.
export const dynamic = "force-dynamic";

// No webfont in any edition. 3.0 asks for the system's rounded face
// (`ui-rounded`, which Safari has) and falls back to the platform's own UI
// face (globals.css, --type-display); 2.0 and 1.0 keep their period stacks.
// A build never downloads a font, and a page never waits for one.

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const experience = await getExperience();
  return (
    <html
      lang="en"
      data-experience={experience}
      suppressHydrationWarning
    >
      <head>
        <JsonLd data={siteJsonLd()} />
      </head>
      <body className="flex min-h-screen flex-col">
        <SkipLink />
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

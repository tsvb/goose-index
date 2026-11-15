import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import localFont from "next/font/local";
import "./globals.css";
import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";
import { SkipLink } from "./_components/skip-link";
import { themeScript } from "@/lib/theme";
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

// Pages read live DB data and `etToday()` (e.g. "On This Day"), and the
// experience cookie is a Dynamic API, so HTML still renders per request.
// Catalog queries are cached in lib/queries/cache.ts — that's what keeps
// Neon from waking on every crawler hit.
export const dynamic = "force-dynamic";

// The 3.0 faces. Loaded here as CSS variables; globals.css only picks them up
// under [data-experience="fancy"], so 2.0 keeps Verdana/Tahoma and 1.0 keeps
// Georgia — each edition wears its own period. Newsreader is a variable serif
// with an optical-size axis (the .font-display hook turns it on); Plex Sans
// is the instrument half — body text, and the labels, dates and figures that
// carry `.font-mono`, which switches on its tabular figures.
//
// The files live in app/fonts (latin subset, SIL Open Font License — the
// licenses sit beside them). They used to come from `next/font/google`, which
// downloads them from Google during every build: when that download failed, the
// build failed with a webpack error in the CSS step and nothing in the diff to
// explain it. A build should not depend on a third party being reachable.
const display = localFont({
  src: [
    { path: "./fonts/newsreader-latin-opsz-normal.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/newsreader-latin-opsz-italic.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--font-display-face",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});
const body = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "./fonts/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "./fonts/ibm-plex-sans-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--font-body-face",
  display: "swap",
  adjustFontFallback: "Arial",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const experience = await getExperience();
  return (
    <html
      lang="en"
      data-experience={experience}
      className={`${display.variable} ${body.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
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

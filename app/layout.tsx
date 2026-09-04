import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Newsreader, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
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
// and Plex Mono are the instrument half, and Plex Mono's figures are tabular.
const display = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display-face",
  display: "swap",
});
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body-face",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono-face",
  display: "swap",
});


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const experience = await getExperience();
  return (
    <html
      lang="en"
      data-experience={experience}
      className={`${display.variable} ${body.variable} ${mono.variable}`}
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

import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, JetBrains_Mono, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteHeader } from "./_components/site-header";
import { SiteFooter } from "./_components/site-footer";
import { SkipLink } from "./_components/skip-link";
import { DEFAULT_THEME, themeScript } from "@/lib/theme";
import { getExperience } from "@/lib/experience.server";
import { JsonLd } from "./_components/json-ld";
import { siteJsonLd } from "@/lib/jsonld";
import { SITE_URL } from "@/lib/site";

// Fancy display face.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
// Fancy body + mono.
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});
// Functional: one grotesque for everything + a mono for figures.
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});
// Minimal uses the system font stack (no webfont) — see globals.css.

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

// Pages read live DB data and `current_date` (e.g. "On This Day"), so render
// per-request rather than freezing at build time.
export const dynamic = "force-dynamic";


export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const experience = await getExperience();
  return (
    <html
      lang="en"
      data-theme={DEFAULT_THEME}
      data-experience={experience}
      className={`${bricolage.variable} ${hanken.variable} ${jetbrains.variable} ${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <JsonLd data={siteJsonLd()} />
      </head>
      <body className="flex min-h-screen flex-col">
        <SkipLink />
        {experience === "fancy" && <div className="grain-overlay" aria-hidden />}
        <SiteHeader />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}

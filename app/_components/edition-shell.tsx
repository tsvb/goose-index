import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { SiteHeader } from "@/app/_components/site-header";
import { SiteFooter } from "@/app/_components/site-footer";
import { SkipLink } from "@/app/_components/skip-link";
import { JsonLd } from "@/app/_components/json-ld";
import { siteJsonLd } from "@/lib/jsonld";
import type { Experience } from "@/lib/experience";

// The <html> shell for one edition. app/edition/[experience]/layout.tsx wraps
// every page in it; app/not-found.tsx wraps the 404 page in it, since that
// route sits outside the edition segment.
export function EditionShell({ experience, children }: { experience: Experience; children: React.ReactNode }) {
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
        <SiteHeader experience={experience} />
        <main id="main" className="flex-1">{children}</main>
        <SiteFooter experience={experience} />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

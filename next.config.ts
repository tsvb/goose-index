import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Sent on every response. The CSP carries only the directives that hold without
// touching scripts: the theme bootstrap, JSON-LD and Next's own hydration data
// are inline, so a `script-src` would need a per-request nonce to mean anything.
// What is here stops the site being framed (clickjacking), a stray <base> or
// <form> pointing off-site, and plugins. HSTS is absent on purpose: Vercel
// already sends it for the production domain.
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
];

// The sitemap renders per request (app/sitemap.ts says why: a build must not
// open the database). Its rows come from the Data Cache, but laying out every
// show, song and venue is still a function run for each crawler that asks.
// Vercel's CDN keeps it for an hour instead, then serves the old copy while it
// fetches a new one. Next replaces a Cache-Control set here on its own routes;
// this header is Vercel's alone, so it survives.
const sitemapHeaders = [
  { key: "Vercel-CDN-Cache-Control", value: "max-age=3600, stale-while-revalidate=86400" },
];

const nextConfig: NextConfig = {
  // Don't advertise the framework.
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/sitemap.xml", headers: sitemapHeaders },
    ];
  },
  // Pin the file-tracing root to this project (a stray lockfile in a parent
  // directory otherwise makes Next infer the wrong workspace root).
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // Blog posts are read from content/blog with fs at request time; nothing
  // imports them, so the tracer can't see them. Without this, the deployed
  // functions ship an empty content dir and the blog quietly renders "No
  // posts yet." — list every route that calls lib/blog/posts.
  outputFileTracingIncludes: {
    // Pages live under app/edition/[experience]/ (see proxy.ts).
    "/edition/[experience]/blog": ["./content/blog/*.md"],
    "/edition/[experience]/blog/[slug]": ["./content/blog/*.md"],
    "/blog/feed.xml": ["./content/blog/*.md"],
    "/sitemap.xml": ["./content/blog/*.md"],
  },
};

export default nextConfig;

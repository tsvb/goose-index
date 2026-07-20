import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const nextConfig: NextConfig = {
  // Pin the file-tracing root to this project (a stray lockfile in a parent
  // directory otherwise makes Next infer the wrong workspace root).
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
  // Blog posts are read from content/blog with fs at request time; nothing
  // imports them, so the tracer can't see them. Without this, the deployed
  // functions ship an empty content dir and the blog quietly renders "No
  // posts yet." — list every route that calls lib/blog/posts.
  outputFileTracingIncludes: {
    "/blog": ["./content/blog/*.md"],
    "/blog/[slug]": ["./content/blog/*.md"],
    "/blog/feed.xml": ["./content/blog/*.md"],
    "/sitemap.xml": ["./content/blog/*.md"],
  },
};

export default nextConfig;

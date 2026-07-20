import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { listPosts } from "@/lib/blog/posts";
import { formatShortDate } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes from building and running the Goose Index.",
  alternates: {
    canonical: canonicalUrl("/blog"),
    types: { "application/rss+xml": canonicalUrl("/blog/feed.xml") },
  },
};

export default async function BlogPage() {
  const [posts, experience] = [listPosts(), await getExperience()];

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Blog" }]} />
          <h1>Blog</h1>
          <p className="doc-crumb">
            {posts.length} {posts.length === 1 ? "post" : "posts"} ·{" "}
            <a href="/blog/feed.xml">RSS</a>
          </p>
          {posts.length === 0 ? (
            <p>No posts yet.</p>
          ) : (
            <table className="doc-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Post</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.slug}>
                    <td className="nowrap">{p.date}</td>
                    <td>
                      <Link href={`/blog/${p.slug}`}>{p.title}</Link>
                      <span className="sub"> — {p.summary}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Doc>
      </Container>
    );
  }

  return (
    <>
      <header className="border-b border-line">
        <Container className="py-12 sm:py-16">
          <span className="eyebrow">Notes from the desk</span>
          <h1 className="mt-3 font-display text-[2.4rem] leading-none tracking-tight text-ink sm:text-5xl">
            Blog
          </h1>
          <p className="mt-3 font-mono text-xs text-faint">
            {posts.length} {posts.length === 1 ? "post" : "posts"} ·{" "}
            <a href="/blog/feed.xml" className="underline decoration-line underline-offset-2 hover:text-muted">
              RSS
            </a>
          </p>
        </Container>
      </header>

      <Container className="py-10 sm:py-14">
        {posts.length === 0 ? (
          <p className="text-muted">No posts yet.</p>
        ) : (
          <div className="surface-card overflow-hidden">
            {posts.map((p) => (
              <Link
                key={p.slug}
                href={`/blog/${p.slug}`}
                className="group flex flex-col gap-1 border-b border-line-soft px-4 py-4 transition last:border-0 hover:bg-surface-2"
              >
                <span className="font-mono text-xs text-faint">{formatShortDate(p.date)}</span>
                <span className="font-display text-lg text-ink transition group-hover:text-gold">{p.title}</span>
                <span className="text-sm text-muted">{p.summary}</span>
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

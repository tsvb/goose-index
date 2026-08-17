import Link from "next/link";
import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { PageHead, chromeLink, chromeDate } from "@/app/_components/page-chrome";
import { SectionRule, Ledger } from "@/app/_components/forms";
import { listPosts } from "@/lib/blog/posts";
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
    <Container>
      <PageHead
        kicker="notes from the desk"
        title="blog"
        meta={
          <>
            {posts.length} {posts.length === 1 ? "post" : "posts"} ·{" "}
            <a href="/blog/feed.xml" className={chromeLink}>
              RSS
            </a>
          </>
        }
      />

      <SectionRule title="posts" seed="blog-index" />
      {posts.length === 0 ? (
        <p className="mt-4 text-muted">No posts yet.</p>
      ) : (
        <Ledger seed="blog">
          {posts.map((p) => (
            <Link key={p.slug} href={`/blog/${p.slug}`} className="group flex flex-col gap-1 py-3">
              <span className="font-mono text-xs text-steel">{chromeDate(p.date)}</span>
              <span className="text-[1.05rem] text-ink underline-offset-4 group-hover:underline">{p.title}</span>
              <span className="text-sm text-muted">{p.summary}</span>
            </Link>
          ))}
        </Ledger>
      )}
    </Container>
  );
}

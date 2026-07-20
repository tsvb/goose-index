import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata, ResolvingMetadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb, MetaTable } from "@/app/_components/doc";
import { PostBody } from "@/app/_components/post-body";
import { JsonLd } from "@/app/_components/json-ld";
import { blogPostingJsonLd } from "@/lib/jsonld";
import { getPost, listPosts, type Post } from "@/lib/blog/posts";
import { formatLongDate, formatShortDate } from "@/lib/queries/format";
import { getExperience } from "@/lib/experience.server";
import { canonicalUrl, entityMetadata } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params, parent: ResolvingMetadata): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found" };
  const shared = entityMetadata({
    title: post.title,
    description: post.summary,
    path: `/blog/${post.slug}`,
    parent: await parent,
  });
  return {
    title: post.title,
    description: post.summary,
    ...shared,
    // Feed discovery rides along with the canonical (alternates replaces
    // wholesale, so both must be declared together).
    alternates: {
      ...shared.alternates,
      types: { "application/rss+xml": canonicalUrl("/blog/feed.xml") },
    },
  };
}

/** Adjacent posts in the newest-first list: "newer" reads leftward. */
function neighbors(post: Post): { newer: Post | null; older: Post | null } {
  const posts = listPosts();
  const at = posts.findIndex((p) => p.slug === post.slug);
  return { newer: at > 0 ? posts[at - 1] : null, older: at < posts.length - 1 ? posts[at + 1] : null };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();
  const experience = await getExperience();
  const { newer, older } = neighbors(post);

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <JsonLd data={blogPostingJsonLd(post)} />
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/blog", label: "Blog" }, { label: post.title }]} />
          <h1>{post.title}</h1>
          <MetaTable
            rows={[
              { k: "Published", v: formatLongDate(post.date) },
              ...(post.tags.length ? [{ k: "Tags", v: post.tags.join(", ") }] : []),
            ]}
          />
          <PostBody blocks={post.body} />
          <p className="doc-foot">
            {older && (
              <>
                Older: <Link href={`/blog/${older.slug}`}>{older.title}</Link>
                <br />
              </>
            )}
            {newer && (
              <>
                Newer: <Link href={`/blog/${newer.slug}`}>{newer.title}</Link>
                <br />
              </>
            )}
            <Link href="/blog">All posts</Link>
          </p>
        </Doc>
      </Container>
    );
  }

  return (
    <>
      <JsonLd data={blogPostingJsonLd(post)} />
      <header className="border-b border-line">
        <Container className="py-12 sm:py-16">
          <div className="almanac-masthead">
            <span className="eyebrow">
              <Link href="/blog" className="hover:text-gold">Blog</Link> · {formatShortDate(post.date)}
            </span>
            <h1 className="mt-3 max-w-3xl font-display text-[2.1rem] leading-tight tracking-tight text-ink sm:text-4xl">
              {post.title}
            </h1>
            <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-muted">{post.summary}</p>
          </div>
        </Container>
      </header>

      <Container className="py-10 sm:py-14">
        <article>
          <PostBody blocks={post.body} />
        </article>
        {post.tags.length > 0 && (
          <p className="mt-10 font-mono text-xs text-faint">filed under: {post.tags.join(" · ")}</p>
        )}
        <nav aria-label="Post navigation" className="mt-10 flex flex-col gap-2 border-t border-line pt-6 font-mono text-xs sm:flex-row sm:items-center sm:justify-between">
          <span>
            {older ? (
              <Link href={`/blog/${older.slug}`} className="text-muted transition hover:text-gold">
                ← {older.title}
              </Link>
            ) : (
              <span className="text-faint">This is the first post.</span>
            )}
          </span>
          <span>
            {newer && (
              <Link href={`/blog/${newer.slug}`} className="text-muted transition hover:text-gold">
                {newer.title} →
              </Link>
            )}
          </span>
        </nav>
      </Container>
    </>
  );
}

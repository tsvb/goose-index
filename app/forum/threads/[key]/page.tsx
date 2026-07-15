import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { JsonLd } from "@/app/_components/json-ld";
import { forumThreadJsonLd } from "@/lib/jsonld";
import { getExperience } from "@/lib/experience.server";
import { currentUser } from "@/lib/auth/session.server";
import { getThread, getPosts } from "@/lib/queries/forum";
import { POSTS_PER_PAGE } from "@/lib/forum/constants";
import { parseThreadKey, threadPath, boardPath } from "@/lib/forum/urls";
import { PostCard, ReactionBar } from "../../_components/post-card";
import { Pager } from "../../_components/pager";
import { UserStrip } from "../../_components/user-strip";
import { Composer } from "../../_components/composer";
import { replyAction } from "../../actions";

type Params = Promise<{ key: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const parsed = parseThreadKey((await params).key);
  const thread = parsed ? await getThread(parsed.id) : null;
  return { title: thread ? `${thread.title} — Forum` : "Forum" };
}

export default async function ThreadPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ key }, sp] = await Promise.all([params, searchParams]);
  const parsed = parseThreadKey(key);
  if (!parsed) notFound();
  const thread = await getThread(parsed.id);
  if (!thread) notFound();

  const totalPages = Math.max(1, Math.ceil((thread.replyCount + 1) / POSTS_PER_PAGE));
  const page = Math.min(totalPages, Math.max(1, parseInt(sp.page ?? "1", 10) || 1)); // "unread" → 1 until Task 19
  if (parsed.slug !== thread.slug) redirect(threadPath(thread.id, thread.slug, page)); // canonical URL

  const viewer = await currentUser();
  const [posts, experience] = await Promise.all([
    getPosts(thread.id, page, { viewerId: viewer?.id ?? null, includeDeletedBodies: viewer?.role === "admin" }),
    getExperience(),
  ]);
  const pager = <Pager current={page} total={totalPages} href={(p) => threadPath(thread.id, thread.slug, p)} />;

  const backPath = threadPath(thread.id, thread.slug, page);
  const controlsFor = (p: (typeof posts)[number]) => (
    <>
      <ReactionBar post={p} backPath={backPath}
        canReact={!!viewer && !viewer.bannedAt && viewer.id !== p.authorId && !p.deleted} />
      {viewer && !p.deleted && (p.authorId === viewer.id || viewer.role === "admin") && (
        <Link href={`/forum/posts/${p.id}/edit`} className="text-muted hover:underline">Edit</Link>
      )}
    </>
  );

  const composer = !viewer ? (
    <p className="text-sm text-muted">
      <Link href="/forum/login" className="underline">Log in</Link> or{" "}
      <Link href="/forum/join" className="underline">join</Link> to reply.
    </p>
  ) : thread.locked && viewer.role !== "admin" ? (
    <p className="text-sm text-muted">🔒 This thread is locked.</p>
  ) : (
    <div className="max-w-2xl">
      {thread.locked && <p className="mb-2 text-xs text-muted">Posting as admin — thread is locked.</p>}
      <Composer action={replyAction} hidden={{ threadId: thread.id }} submitLabel="Post reply" />
    </div>
  );

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[
            { href: "/", label: "Goose Index" }, { href: "/forum", label: "Forum" },
            { href: boardPath(thread.boardSlug), label: thread.boardTitle }, { label: thread.title },
          ]} />
          <h1>{thread.pinned && "📌 "}{thread.locked && "🔒 "}{thread.title}</h1>
          <UserStrip />
          {/* structured data describes the thread from its OP — only valid on page 1 */}
          {page === 1 && <JsonLd data={forumThreadJsonLd(thread, posts)} />}
          {posts.map((p) => <PostCard key={p.id} post={p} experience={experience} controls={controlsFor(p)} />)}
          {composer}
          {pager}
        </Doc>
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            <Link href="/forum" className="hover:underline">Forum</Link> ›{" "}
            <Link href={boardPath(thread.boardSlug)} className="hover:underline">{thread.boardTitle}</Link>
          </p>
          <h1 className={experience === "fancy" ? "font-display text-3xl tracking-tight" : "text-2xl font-bold"}>
            {thread.pinned && "📌 "}{thread.locked && "🔒 "}{thread.title}
          </h1>
        </div>
        <UserStrip />
      </div>
      <div className="mt-4">{pager}</div>
      <div className="mt-4 flex flex-col gap-3">
        {posts.map((p) => <PostCard key={p.id} post={p} experience={experience} controls={controlsFor(p)} />)}
      </div>
      <div className="mt-6">{composer}</div>
      <div className="mt-4">{pager}</div>
    </Container>
  );
}

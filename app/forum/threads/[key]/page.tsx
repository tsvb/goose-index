import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { JsonLd } from "@/app/_components/json-ld";
import { forumThreadJsonLd } from "@/lib/jsonld";
import { getExperience } from "@/lib/experience.server";
import { currentUser } from "@/lib/auth/session.server";
import { getThread, getPosts, firstUnread, getPostForEdit } from "@/lib/queries/forum";
import { markThreadRead } from "@/lib/forum/mutations";
import { POSTS_PER_PAGE } from "@/lib/forum/constants";
import { parseThreadKey, threadPath, boardPath } from "@/lib/forum/urls";
import { quoteBBCode } from "@/lib/forum/quote";
import { PostCard, ReactionBar } from "../../_components/post-card";
import { Pager } from "../../_components/pager";
import { UserStrip } from "../../_components/user-strip";
import { Composer } from "../../_components/composer";
import { QuoteButton } from "../../_components/quote-button";
import {
  replyAction, reportAction,
  adminSetPostDeletedAction, adminSetThreadLockedAction, adminSetThreadPinnedAction,
} from "../../actions";

type Params = Promise<{ key: string }>;
type SearchParams = Promise<{ page?: string; quote?: string }>;

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
  const viewer = await currentUser();
  if (sp.page === "unread" && viewer) {
    const fu = await firstUnread(thread.id, viewer.id);
    redirect(fu
      ? `${threadPath(thread.id, thread.slug, fu.page)}#post-${fu.postId}`
      : threadPath(thread.id, thread.slug, totalPages));
  }
  const page = Math.min(totalPages, Math.max(1, parseInt(sp.page ?? "1", 10) || 1)); // "unread" → 1 for signed-out visitors
  if (parsed.slug !== thread.slug) redirect(threadPath(thread.id, thread.slug, page)); // canonical URL

  const [posts, experience] = await Promise.all([
    getPosts(thread.id, page, { viewerId: viewer?.id ?? null, includeDeletedBodies: viewer?.role === "admin" }),
    getExperience(),
  ]);
  if (viewer && posts.length > 0) {
    await markThreadRead(viewer.id, thread.id, posts[posts.length - 1].id);
  }
  const pager = <Pager current={page} total={totalPages} href={(p) => threadPath(thread.id, thread.slug, p)} />;

  const backPath = threadPath(thread.id, thread.slug, page);
  const adminButton = "border border-line px-2 py-0.5 font-mono text-xs text-muted hover:text-ink";
  const adminThreadControls = viewer?.role === "admin" && (
    <span className="flex items-center gap-2">
      <form action={adminSetThreadLockedAction}>
        <input type="hidden" name="threadId" value={thread.id} />
        <input type="hidden" name="locked" value={thread.locked ? "0" : "1"} />
        <input type="hidden" name="back" value={backPath} />
        <button type="submit" className={adminButton}>{thread.locked ? "Unlock" : "Lock"}</button>
      </form>
      <form action={adminSetThreadPinnedAction}>
        <input type="hidden" name="threadId" value={thread.id} />
        <input type="hidden" name="pinned" value={thread.pinned ? "0" : "1"} />
        <input type="hidden" name="back" value={backPath} />
        <button type="submit" className={adminButton}>{thread.pinned ? "Unpin" : "Pin"}</button>
      </form>
    </span>
  );
  const controlsFor = (p: (typeof posts)[number]) => (
    <>
      <ReactionBar post={p} backPath={backPath}
        canReact={!!viewer && !viewer.bannedAt && viewer.id !== p.authorId && !p.deleted} />
      {viewer && !p.deleted && (p.authorId === viewer.id || viewer.role === "admin") && (
        <Link href={`/forum/posts/${p.id}/edit`} className="text-muted hover:underline">Edit</Link>
      )}
      {viewer && !p.deleted && p.body != null && (
        <QuoteButton author={p.author} body={p.body}
          fallbackHref={`${threadPath(thread.id, thread.slug)}?page=${totalPages}&quote=${p.id}#composer`} />
      )}
      {viewer && !p.deleted && p.authorId !== viewer.id && (
        <details className="inline-block">
          <summary className="cursor-pointer text-muted hover:underline">Report</summary>
          <form action={reportAction} className="mt-1 flex items-center gap-2">
            <input type="hidden" name="postId" value={p.id} />
            <input type="hidden" name="back" value={backPath} />
            <input name="reason" required minLength={3} maxLength={500} placeholder="What's wrong?"
              className="border border-line bg-transparent px-2 py-0.5 text-xs" />
            <button type="submit" className="border border-line px-2 py-0.5 text-xs">Send</button>
          </form>
        </details>
      )}
      {viewer?.role === "admin" && (
        <form action={adminSetPostDeletedAction} className="inline">
          <input type="hidden" name="postId" value={p.id} />
          <input type="hidden" name="deleted" value={p.deleted ? "0" : "1"} />
          <input type="hidden" name="back" value={backPath} />
          <button type="submit" className="text-muted hover:underline">{p.deleted ? "Restore" : "Delete"}</button>
        </form>
      )}
    </>
  );

  let initialBody = "";
  const quoteId = parseInt(sp.quote ?? "", 10);
  if (viewer && quoteId) {
    const q = await getPostForEdit(quoteId);
    if (q && !q.deleted && q.threadId === thread.id) initialBody = quoteBBCode(q.author, q.body);
  }

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
      <Composer action={replyAction} hidden={{ threadId: thread.id }} submitLabel="Post reply" initialBody={initialBody} />
    </div>
  );

  if (experience === "minimal") {
    const seenAuthors = new Set<number>();
    const showSig = (p: (typeof posts)[number]) => {
      if (seenAuthors.has(p.authorId)) return false;
      seenAuthors.add(p.authorId);
      return true;
    };
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[
            { href: "/", label: "Goose Index" }, { href: "/forum", label: "Forum" },
            { href: boardPath(thread.boardSlug), label: thread.boardTitle }, { label: thread.title },
          ]} />
          <div className="flex flex-wrap items-center gap-2">
            <h1>{thread.pinned && "📌 "}{thread.locked && "🔒 "}{thread.title}</h1>
            {adminThreadControls}
          </div>
          <UserStrip />
          {/* structured data describes the thread from its OP — only valid on page 1 */}
          {page === 1 && <JsonLd data={forumThreadJsonLd(thread, posts)} />}
          {posts.map((p) => <PostCard key={p.id} post={p} experience={experience} controls={controlsFor(p)} showSignature={showSig(p)} />)}
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
          <div className="flex flex-wrap items-center gap-2">
            <h1 className={experience === "fancy" ? "font-display text-3xl tracking-tight" : "text-2xl font-bold"}>
              {thread.pinned && "📌 "}{thread.locked && "🔒 "}{thread.title}
            </h1>
            {adminThreadControls}
          </div>
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

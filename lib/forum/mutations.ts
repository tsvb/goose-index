import { db } from "@/db/client";
import { forumBoards, forumPosts, forumReactions, forumReadMarkers, forumThreads, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { threadSlug } from "./slugs";
import { TITLE_MIN, TITLE_MAX, BODY_MAX, POSTS_PER_PAGE } from "./constants";
import type { SessionUser } from "@/lib/auth/service";

export type MutationResult<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function bannedError(user: SessionUser): string | null {
  if (!user.bannedAt) return null;
  return user.bannedReason ? `You're banned from posting: ${user.bannedReason}` : "You're banned from posting.";
}

function cleanBody(raw: string): { ok: true; body: string } | { ok: false; error: string } {
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (!body) return { ok: false, error: "Say something — the post is empty." };
  if (body.length > BODY_MAX) return { ok: false, error: `Posts max out at ${BODY_MAX.toLocaleString()} characters.` };
  return { ok: true, body };
}

/** 1-based page a post lands on, by its position within the thread. */
async function postPage(threadId: number, postId: number): Promise<number> {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(forumPosts)
    .where(sql`${forumPosts.threadId} = ${threadId} and ${forumPosts.id} <= ${postId}`);
  return Math.ceil(Number(n) / POSTS_PER_PAGE);
}

export async function createThread(
  user: SessionUser, boardId: number, titleRaw: string, bodyRaw: string,
): Promise<MutationResult<{ threadId: number; slug: string }>> {
  const ban = bannedError(user);
  if (ban) return fail(ban);
  const title = titleRaw.trim().replace(/\s+/g, " ");
  if (title.length < TITLE_MIN || title.length > TITLE_MAX) {
    return fail(`Titles are ${TITLE_MIN}–${TITLE_MAX} characters.`);
  }
  const b = cleanBody(bodyRaw);
  if (!b.ok) return fail(b.error);
  const [board] = await db.select({ id: forumBoards.id }).from(forumBoards).where(eq(forumBoards.id, boardId));
  if (!board) return fail("That board doesn't exist.");

  const slug = threadSlug(title);
  const value = await db.transaction(async (tx) => {
    const [t] = await tx.insert(forumThreads).values({ boardId, authorId: user.id, title, slug })
      .returning({ id: forumThreads.id });
    const [p] = await tx.insert(forumPosts).values({ threadId: t.id, authorId: user.id, body: b.body })
      .returning({ id: forumPosts.id });
    await tx.update(forumThreads).set({ lastPostId: p.id }).where(eq(forumThreads.id, t.id));
    await tx.update(forumBoards).set({
      threadCount: sql`${forumBoards.threadCount} + 1`,
      postCount: sql`${forumBoards.postCount} + 1`,
      lastPostId: p.id,
    }).where(eq(forumBoards.id, boardId));
    await tx.update(users).set({ postCount: sql`${users.postCount} + 1` }).where(eq(users.id, user.id));
    return { threadId: t.id, slug };
  });
  return { ok: true, value };
}

export async function createPost(
  user: SessionUser, threadId: number, bodyRaw: string,
): Promise<MutationResult<{ postId: number; page: number; threadSlug: string }>> {
  const ban = bannedError(user);
  if (ban) return fail(ban);
  const b = cleanBody(bodyRaw);
  if (!b.ok) return fail(b.error);
  const [thread] = await db.select({
    id: forumThreads.id, slug: forumThreads.slug, locked: forumThreads.locked, boardId: forumThreads.boardId,
  }).from(forumThreads).where(eq(forumThreads.id, threadId));
  if (!thread) return fail("That thread doesn't exist.");
  if (thread.locked && user.role !== "admin") return fail("This thread is locked.");

  const postId = await db.transaction(async (tx) => {
    const [p] = await tx.insert(forumPosts).values({ threadId, authorId: user.id, body: b.body })
      .returning({ id: forumPosts.id });
    await tx.update(forumThreads).set({
      replyCount: sql`${forumThreads.replyCount} + 1`, lastPostId: p.id, lastPostAt: new Date(),
    }).where(eq(forumThreads.id, threadId));
    await tx.update(forumBoards).set({
      postCount: sql`${forumBoards.postCount} + 1`, lastPostId: p.id,
    }).where(eq(forumBoards.id, thread.boardId));
    await tx.update(users).set({ postCount: sql`${users.postCount} + 1` }).where(eq(users.id, user.id));
    return p.id;
  });
  return { ok: true, value: { postId, page: await postPage(threadId, postId), threadSlug: thread.slug } };
}

export async function editPost(
  user: SessionUser, postId: number, bodyRaw: string,
): Promise<MutationResult<{ threadId: number; threadSlug: string; page: number }>> {
  const ban = bannedError(user);
  if (ban) return fail(ban);
  const b = cleanBody(bodyRaw);
  if (!b.ok) return fail(b.error);
  const [row] = await db.select({
    authorId: forumPosts.authorId, deletedAt: forumPosts.deletedAt,
    threadId: forumPosts.threadId, threadSlug: forumThreads.slug,
  }).from(forumPosts).innerJoin(forumThreads, eq(forumThreads.id, forumPosts.threadId))
    .where(eq(forumPosts.id, postId));
  if (!row) return fail("That post doesn't exist.");
  if (row.deletedAt) return fail("That post was removed.");
  if (row.authorId !== user.id && user.role !== "admin") return fail("You can only edit your own posts.");

  await db.update(forumPosts).set({ body: b.body, editedAt: new Date(), editedById: user.id })
    .where(eq(forumPosts.id, postId));
  return { ok: true, value: { threadId: row.threadId, threadSlug: row.threadSlug, page: await postPage(row.threadId, postId) } };
}

export async function toggleReaction(
  user: SessionUser, postId: number, kind: "like" | "honk",
): Promise<MutationResult<null>> {
  const ban = bannedError(user);
  if (ban) return fail(ban);
  const [post] = await db.select({ authorId: forumPosts.authorId, deletedAt: forumPosts.deletedAt })
    .from(forumPosts).where(eq(forumPosts.id, postId));
  if (!post || post.deletedAt) return fail("That post can't be reacted to.");
  if (post.authorId === user.id) return fail("No reacting to your own posts.");

  const [existing] = await db.select({ kind: forumReactions.kind }).from(forumReactions)
    .where(sql`${forumReactions.postId} = ${postId} and ${forumReactions.userId} = ${user.id}`);
  if (existing?.kind === kind) {
    await db.delete(forumReactions)
      .where(sql`${forumReactions.postId} = ${postId} and ${forumReactions.userId} = ${user.id}`);
  } else if (existing) {
    await db.update(forumReactions).set({ kind })
      .where(sql`${forumReactions.postId} = ${postId} and ${forumReactions.userId} = ${user.id}`);
  } else {
    await db.insert(forumReactions).values({ postId, userId: user.id, kind })
      .onConflictDoNothing({ target: [forumReactions.postId, forumReactions.userId] });
  }
  return { ok: true, value: null };
}

/** High-water mark: never moves backwards. */
export async function markThreadRead(userId: number, threadId: number, lastReadPostId: number): Promise<void> {
  await db.insert(forumReadMarkers).values({ userId, threadId, lastReadPostId })
    .onConflictDoUpdate({
      target: [forumReadMarkers.userId, forumReadMarkers.threadId],
      set: {
        lastReadPostId: sql`greatest(${forumReadMarkers.lastReadPostId}, ${lastReadPostId})`,
        updatedAt: new Date(),
      },
    });
}

export async function markAllForumsRead(userId: number): Promise<void> {
  await db.update(users).set({ markAllReadAt: new Date() }).where(eq(users.id, userId));
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session.server";
import {
  createThread, createPost, editPost, toggleReaction, markAllForumsRead, reportPost,
  setPostDeleted, setThreadLocked, setThreadPinned, banUser, unbanUser, resolveReport,
} from "@/lib/forum/mutations";
import { threadPath } from "@/lib/forum/urls";
import { safeBack } from "@/lib/forum/safe-back";
import type { ForumFormState } from "./_components/composer";

const str = (fd: FormData, k: string): string => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const int = (fd: FormData, k: string): number => parseInt(str(fd, k), 10) || 0;

export async function newThreadAction(_prev: ForumFormState, fd: FormData): Promise<ForumFormState> {
  const boardSlug = str(fd, "boardSlug");
  const user = await requireUser(`/forum/${boardSlug}/new`);
  const r = await createThread(user, int(fd, "boardId"), str(fd, "title"), str(fd, "body"));
  if (!r.ok) return { error: r.error, draftTitle: str(fd, "title"), draftBody: str(fd, "body") };
  revalidatePath("/forum");
  redirect(threadPath(r.value.threadId, r.value.slug));
}

export async function replyAction(_prev: ForumFormState, fd: FormData): Promise<ForumFormState> {
  const threadId = int(fd, "threadId");
  const user = await requireUser(`/forum/threads/${threadId}`);
  const r = await createPost(user, threadId, str(fd, "body"));
  if (!r.ok) return { error: r.error, draftBody: str(fd, "body") };
  revalidatePath("/forum");
  redirect(`${threadPath(threadId, r.value.threadSlug, r.value.page)}#post-${r.value.postId}`);
}

export async function editPostAction(_prev: ForumFormState, fd: FormData): Promise<ForumFormState> {
  const postId = int(fd, "postId");
  const user = await requireUser(`/forum/posts/${postId}/edit`);
  const r = await editPost(user, postId, str(fd, "body"));
  if (!r.ok) return { error: r.error, draftBody: str(fd, "body") };
  redirect(`${threadPath(r.value.threadId, r.value.threadSlug, r.value.page)}#post-${postId}`);
}

export async function reactAction(fd: FormData): Promise<void> {
  const postId = int(fd, "postId");
  const kind = str(fd, "kind") === "honk" ? "honk" as const : "like" as const;
  const back = safeBack(fd);
  const user = await requireUser(back);
  await toggleReaction(user, postId, kind); // low-stakes: failures just fall through to the redirect
  revalidatePath(back);
  redirect(`${back}#post-${postId}`);
}

export async function markAllReadAction(): Promise<void> {
  const user = await requireUser("/forum");
  await markAllForumsRead(user.id);
  revalidatePath("/forum");
  redirect("/forum");
}

export async function reportAction(fd: FormData): Promise<void> {
  const postId = int(fd, "postId");
  const back = safeBack(fd);
  const user = await requireUser(back);
  await reportPost(user, postId, str(fd, "reason"));
  redirect(`${back}#post-${postId}`);
}

async function adminRedirect(back: string): Promise<never> {
  revalidatePath("/forum");
  redirect(back);
}

export async function adminSetPostDeletedAction(fd: FormData): Promise<void> {
  const user = await requireUser("/forum");
  await setPostDeleted(user, int(fd, "postId"), str(fd, "deleted") === "1");
  await adminRedirect(safeBack(fd));
}

export async function adminSetThreadLockedAction(fd: FormData): Promise<void> {
  const user = await requireUser("/forum");
  await setThreadLocked(user, int(fd, "threadId"), str(fd, "locked") === "1");
  await adminRedirect(safeBack(fd));
}

export async function adminSetThreadPinnedAction(fd: FormData): Promise<void> {
  const user = await requireUser("/forum");
  await setThreadPinned(user, int(fd, "threadId"), str(fd, "pinned") === "1");
  await adminRedirect(safeBack(fd));
}

export async function adminBanAction(fd: FormData): Promise<void> {
  const user = await requireUser("/forum/admin");
  await banUser(user, str(fd, "username"), str(fd, "reason"));
  await adminRedirect("/forum/admin");
}

export async function adminUnbanAction(fd: FormData): Promise<void> {
  const user = await requireUser("/forum/admin");
  await unbanUser(user, str(fd, "username"));
  await adminRedirect("/forum/admin");
}

export async function adminResolveReportAction(fd: FormData): Promise<void> {
  const user = await requireUser("/forum/admin");
  if (str(fd, "alsoDelete") === "1") await setPostDeleted(user, int(fd, "postId"), true);
  await resolveReport(user, int(fd, "reportId"));
  await adminRedirect("/forum/admin");
}

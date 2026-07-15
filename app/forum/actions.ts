"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session.server";
import { createThread, createPost, editPost } from "@/lib/forum/mutations";
import { threadPath } from "@/lib/forum/urls";
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

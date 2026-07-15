"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session.server";
import { createThread, createPost, editPost, toggleReaction, markAllForumsRead, reportPost } from "@/lib/forum/mutations";
import { threadPath } from "@/lib/forum/urls";
import type { ForumFormState } from "./_components/composer";

const str = (fd: FormData, k: string): string => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};
const int = (fd: FormData, k: string): number => parseInt(str(fd, k), 10) || 0;

/** Only same-origin forum paths are valid redirect targets — never an absolute URL. */
function safeBack(fd: FormData, fallback = "/forum"): string {
  const back = str(fd, "back");
  return back.startsWith("/") && !back.startsWith("//") ? back : fallback;
}

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

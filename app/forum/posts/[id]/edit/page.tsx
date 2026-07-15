import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/app/_components/container";
import { getExperience } from "@/lib/experience.server";
import { requireUser } from "@/lib/auth/session.server";
import { getPostForEdit } from "@/lib/queries/forum";
import { Composer } from "../../../_components/composer";
import { editPostAction } from "../../../actions";

export const metadata: Metadata = { title: "Edit post", robots: { index: false } };

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  if (!postId) notFound();
  const user = await requireUser(`/forum/posts/${postId}/edit`);
  const post = await getPostForEdit(postId);
  if (!post || post.deleted) notFound();
  if (post.authorId !== user.id && user.role !== "admin") redirect("/forum");
  await getExperience();
  return (
    <Container className="py-10">
      <h1 className="text-2xl font-bold">Edit post in “{post.threadTitle}”</h1>
      <div className="mt-6 max-w-2xl">
        <Composer action={editPostAction} hidden={{ postId: post.id }} initialBody={post.body} submitLabel="Save edit" />
      </div>
    </Container>
  );
}

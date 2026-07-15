import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/app/_components/container";
import { getExperience } from "@/lib/experience.server";
import { requireUser } from "@/lib/auth/session.server";
import { getBoard } from "@/lib/queries/forum";
import { Composer } from "../../_components/composer";
import { newThreadAction } from "../../actions";

export const metadata: Metadata = { title: "New thread", robots: { index: false } };

export default async function NewThreadPage({ params }: { params: Promise<{ board: string }> }) {
  const { board } = await params;
  const info = await getBoard(board);
  if (!info) notFound();
  await requireUser(`/forum/${board}/new`);
  const experience = await getExperience();
  return (
    <Container className="py-10">
      <h1 className={experience === "fancy" ? "font-display text-3xl tracking-tight" : "text-2xl font-bold"}>
        New thread in {info.title}
      </h1>
      <div className="mt-6 max-w-2xl">
        <Composer action={newThreadAction} hidden={{ boardId: info.id, boardSlug: info.slug }} withTitle submitLabel="Post thread" />
      </div>
    </Container>
  );
}

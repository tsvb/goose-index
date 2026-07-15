import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { getExperience } from "@/lib/experience.server";
import { getBoardIndex } from "@/lib/queries/forum";
import { BoardIndex } from "./_components/board-index";
import { UserStrip } from "./_components/user-strip";

export const metadata: Metadata = { title: "Forum" };

export default async function ForumPage() {
  const [categories, experience] = await Promise.all([getBoardIndex(), getExperience()]);
  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Forum" }]} />
          <h1>Forum</h1>
          <UserStrip />
          <BoardIndex categories={categories} experience={experience} />
        </Doc>
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={experience === "fancy" ? "font-display text-4xl tracking-tight" : "text-2xl font-bold"}>Forum</h1>
        <UserStrip />
      </div>
      <div className="mt-8"><BoardIndex categories={categories} experience={experience} /></div>
    </Container>
  );
}

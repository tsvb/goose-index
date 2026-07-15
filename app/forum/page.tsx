import type { Metadata } from "next";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { getExperience } from "@/lib/experience.server";
import { currentUser } from "@/lib/auth/session.server";
import { getBoardIndex, getOnlineMembers } from "@/lib/queries/forum";
import { BoardIndex } from "./_components/board-index";
import { UserStrip } from "./_components/user-strip";
import { markAllReadAction } from "./actions";

export const metadata: Metadata = { title: "Forum" };

export default async function ForumPage() {
  const [categories, experience, viewer, online] = await Promise.all([getBoardIndex(), getExperience(), currentUser(), getOnlineMembers()]);
  const markAllRead = viewer && (
    <form action={markAllReadAction}>
      <button type="submit" className="text-xs text-muted underline">Mark forums read</button>
    </form>
  );
  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Forum" }]} />
          <h1>Forum</h1>
          <UserStrip />
          {markAllRead}
          <BoardIndex categories={categories} experience={experience} />
          <p className="mt-8 border-t border-line pt-3 text-xs text-muted">
            Members online in the last 15 minutes:{" "}
            {online.length > 0 ? online.join(", ") : "none — quiet out there"} ({online.length})
          </p>
        </Doc>
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={experience === "fancy" ? "font-display text-4xl tracking-tight" : "text-2xl font-bold"}>Forum</h1>
        <div className="flex flex-col items-end gap-1">
          <UserStrip />
          {markAllRead}
        </div>
      </div>
      <div className="mt-8"><BoardIndex categories={categories} experience={experience} /></div>
      <p className="mt-8 border-t border-line pt-3 text-xs text-muted">
        Members online in the last 15 minutes:{" "}
        {online.length > 0 ? online.join(", ") : "none — quiet out there"} ({online.length})
      </p>
    </Container>
  );
}

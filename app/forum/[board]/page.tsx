import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/app/_components/container";
import { Doc, Breadcrumb } from "@/app/_components/doc";
import { getExperience } from "@/lib/experience.server";
import { getBoard, getThreadRows } from "@/lib/queries/forum";
import { THREADS_PER_PAGE } from "@/lib/forum/constants";
import { boardPath } from "@/lib/forum/urls";
import { ThreadTable } from "../_components/thread-list";
import { Pager } from "../_components/pager";
import { UserStrip } from "../_components/user-strip";

type Params = Promise<{ board: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const info = await getBoard((await params).board);
  return { title: info ? `${info.title} — Forum` : "Forum" };
}

export default async function BoardPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ board }, sp] = await Promise.all([params, searchParams]);
  const info = await getBoard(board);
  if (!info) notFound();
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const [rows, experience] = await Promise.all([getThreadRows(info.id, page), getExperience()]);
  const totalPages = Math.max(1, Math.ceil(info.threadCount / THREADS_PER_PAGE));

  const newThread = (
    <Link href={`/forum/${info.slug}/new`} className="border border-line px-3 py-1 text-sm hover:border-line-soft">
      Post New Thread
    </Link>
  );
  const pager = <Pager current={page} total={totalPages} href={(p) => boardPath(info.slug, p)} />;

  if (experience === "minimal") {
    return (
      <Container className="py-8">
        <Doc>
          <Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { href: "/forum", label: "Forum" }, { label: info.title }]} />
          <h1>{info.title}</h1>
          <p>{info.description}</p>
          <UserStrip />
          <p>{newThread}</p>
          <ThreadTable rows={rows} experience={experience} />
          {pager}
        </Doc>
      </Container>
    );
  }
  return (
    <Container className="py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-muted"><Link href="/forum" className="hover:underline">Forum</Link> ›</p>
          <h1 className={experience === "fancy" ? "font-display text-3xl tracking-tight" : "text-2xl font-bold"}>{info.title}</h1>
          <p className="text-sm text-muted">{info.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <UserStrip />
          {newThread}
        </div>
      </div>
      <div className="mt-6">
        <ThreadTable rows={rows} experience={experience} />
      </div>
      <div className="mt-4">{pager}</div>
    </Container>
  );
}

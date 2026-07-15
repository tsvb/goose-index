import Link from "next/link";
import type { ThreadRow } from "@/lib/queries/forum";
import type { Experience } from "@/lib/experience";
import { threadPath } from "@/lib/forum/urls";
import { clsx } from "@/app/_components/clsx";

export function ThreadTable({ rows, experience }: { rows: ThreadRow[]; experience: Experience }) {
  if (rows.length === 0) return <p className="py-8 text-sm text-muted">No threads yet — start one.</p>;
  if (experience === "minimal") {
    return (
      <ul>
        {rows.map((t) => (
          <li key={t.id}>
            {t.pinned && "📌 "}{t.locked && "🔒 "}
            <Link href={threadPath(t.id, t.slug)} className={clsx("underline", t.unread && "font-bold")}>{t.title}</Link>
            {" "}by {t.author} · {t.replyCount} replies · last {t.lastPostAt} by {t.lastPostAuthor}
            {t.unread && <> · <Link className="underline" href={`${threadPath(t.id, t.slug)}?page=unread`}>first unread</Link></>}
          </li>
        ))}
      </ul>
    );
  }
  const fancy = experience === "fancy";
  return (
    <div className={clsx("divide-y divide-line border border-line", fancy && "surface-card rounded-lg")}>
      {rows.map((t) => (
        <div key={t.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            {(t.pinned || t.locked) && <span className="mr-1 text-xs">{t.pinned && "📌"}{t.locked && "🔒"}</span>}
            <Link href={threadPath(t.id, t.slug)} className={clsx("text-ink hover:underline", t.unread && "font-bold")}>
              {t.title}
            </Link>
            {t.unread && (
              <Link href={`${threadPath(t.id, t.slug)}?page=unread`} className="ml-2 font-mono text-[0.65rem] text-muted hover:underline">
                → first unread
              </Link>
            )}
            <p className="text-xs text-muted">by {t.author}</p>
          </div>
          <div className="font-mono text-xs text-muted">{t.replyCount} replies</div>
          <div className="w-full text-xs text-muted sm:w-56">last {t.lastPostAt} by {t.lastPostAuthor}</div>
        </div>
      ))}
    </div>
  );
}

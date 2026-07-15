import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/app/_components/container";
import { requireUser } from "@/lib/auth/session.server";
import { getExperience } from "@/lib/experience.server";
import { getOpenReports, getRecentMembers } from "@/lib/queries/forum";
import { threadPath } from "@/lib/forum/urls";
import { adminBanAction, adminUnbanAction, adminResolveReportAction } from "../actions";

export const metadata: Metadata = { title: "Forum admin", robots: { index: false } };

export default async function AdminPage() {
  const user = await requireUser("/forum/admin");
  if (user.role !== "admin") redirect("/forum");
  await getExperience();
  const [reports, members] = await Promise.all([getOpenReports(), getRecentMembers()]);
  const btn = "border border-line px-2 py-0.5 text-xs hover:border-line-soft";
  return (
    <Container className="py-10 text-sm">
      <h1 className="text-2xl font-bold">Forum admin</h1>

      <section className="mt-8">
        <h2 className="font-bold">Open reports ({reports.length})</h2>
        {reports.length === 0 ? <p className="mt-2 text-muted">Queue&apos;s clear. 🪿</p> : (
          <ul className="mt-2 flex flex-col gap-4">
            {reports.map((r) => (
              <li key={r.id} className="border border-line p-3">
                <p>
                  <Link href={`${threadPath(r.threadId, r.threadSlug)}#post-${r.postId}`} className="underline">{r.threadTitle}</Link>
                  {" "}— post by {r.postAuthor}, reported by {r.reporter} at {r.at}
                </p>
                <p className="mt-1 text-muted">“{r.reason}”</p>
                <p className="mt-1 border-l-2 border-line pl-2 text-muted">{r.postExcerpt}</p>
                <div className="mt-2 flex gap-2">
                  <form action={adminResolveReportAction}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <input type="hidden" name="postId" value={r.postId} />
                    <button type="submit" className={btn}>Resolve</button>
                  </form>
                  <form action={adminResolveReportAction}>
                    <input type="hidden" name="reportId" value={r.id} />
                    <input type="hidden" name="postId" value={r.postId} />
                    <input type="hidden" name="alsoDelete" value="1" />
                    <button type="submit" className={btn}>Delete post + resolve</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-bold">Recent members</h2>
        <ul className="mt-2 flex flex-col gap-1">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-2">
              <Link href={`/forum/members/${m.username}`} className="underline">{m.username}</Link>
              <span className="font-mono text-xs text-muted">joined {m.joined} · {m.postCount} posts</span>
              {m.banned ? (
                <>
                  <span className="text-xs text-red-600">banned{m.bannedReason ? `: ${m.bannedReason}` : ""}</span>
                  <form action={adminUnbanAction}>
                    <input type="hidden" name="username" value={m.username.toLowerCase()} />
                    <button type="submit" className={btn}>Unban</button>
                  </form>
                </>
              ) : (
                <form action={adminBanAction} className="flex items-center gap-1">
                  <input type="hidden" name="username" value={m.username.toLowerCase()} />
                  <input name="reason" placeholder="reason" className="border border-line bg-transparent px-1 py-0.5 text-xs" />
                  <button type="submit" className={btn}>Ban</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </Container>
  );
}

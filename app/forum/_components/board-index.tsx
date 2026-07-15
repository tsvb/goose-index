import Link from "next/link";
import type { BoardIndexCategory } from "@/lib/queries/forum";
import type { Experience } from "@/lib/experience";
import { threadPath } from "@/lib/forum/urls";
import { clsx } from "@/app/_components/clsx";

export function BoardIndex({ categories, experience }: { categories: BoardIndexCategory[]; experience: Experience }) {
  if (experience === "minimal") {
    return (
      <>
        {categories.map((c) => (
          <section key={c.id}>
            <h2>{c.title}</h2>
            <ul>
              {c.boards.map((b) => (
                <li key={b.id}>
                  <Link href={`/forum/${b.slug}`} className="underline">{b.title}</Link> — {b.description}{" "}
                  ({b.threadCount} threads · {b.postCount} posts)
                  {b.lastPost && (
                    <> · last: <Link className="underline" href={threadPath(b.lastPost.threadId, b.lastPost.threadSlug)}>
                      {b.lastPost.threadTitle}</Link> by {b.lastPost.author} at {b.lastPost.at}</>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </>
    );
  }
  const fancy = experience === "fancy";
  return (
    <div className="flex flex-col gap-6">
      {categories.map((c) => (
        <section key={c.id}>
          <h2 className={fancy ? "font-display text-xl text-ink" : "text-sm font-bold uppercase tracking-wide text-muted"}>
            {c.title}
          </h2>
          <div className={clsx("mt-2 divide-y divide-line border border-line", fancy && "surface-card rounded-lg")}>
            {c.boards.map((b) => (
              <div key={b.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/forum/${b.slug}`} className="font-medium text-ink hover:underline">{b.title}</Link>
                  <p className="text-sm text-muted">{b.description}</p>
                </div>
                <div className="font-mono text-xs text-muted">{b.threadCount} threads · {b.postCount} posts</div>
                <div className="w-full text-xs text-muted sm:w-72">
                  {b.lastPost ? (
                    <>
                      <Link href={threadPath(b.lastPost.threadId, b.lastPost.threadSlug)} className="block truncate hover:underline">
                        {b.lastPost.threadTitle}
                      </Link>
                      <span>by {b.lastPost.author} · {b.lastPost.at}</span>
                    </>
                  ) : (
                    <span>No posts yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

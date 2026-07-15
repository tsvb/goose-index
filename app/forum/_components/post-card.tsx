import Link from "next/link";
import type { ReactNode } from "react";
import type { PostView } from "@/lib/queries/forum";
import type { Experience } from "@/lib/experience";
import { BBCodeBody } from "@/lib/forum/bbcode-render";
import { clsx } from "@/app/_components/clsx";
import { reactAction } from "../actions";

function Body({ post }: { post: PostView }) {
  if (!post.deleted) return <BBCodeBody source={post.body ?? ""} />;
  return (
    <div>
      <p className="italic text-faint">Removed by a moderator.</p>
      {post.body != null && (
        <div className="mt-2 border border-dashed border-line p-2 text-muted">
          <BBCodeBody source={post.body} />
        </div>
      )}
    </div>
  );
}

export function PostCard({ post, experience, controls }: { post: PostView; experience: Experience; controls?: ReactNode }) {
  const meta = `${post.at}${post.editedAt ? ` · edited ${post.editedAt}` : ""}`;
  if (experience === "minimal") {
    return (
      <article id={`post-${post.id}`}>
        <p>
          <Link href={`/forum/members/${post.author}`} className="underline">{post.author}</Link> · {meta}
        </p>
        <Body post={post} />
        {controls}
        <hr />
      </article>
    );
  }
  const fancy = experience === "fancy";
  return (
    <article id={`post-${post.id}`}
      className={clsx("flex flex-col gap-3 border border-line p-4 sm:flex-row", fancy && "surface-card rounded-lg")}>
      <aside className="w-full shrink-0 text-xs text-muted sm:w-36">
        <Link href={`/forum/members/${post.author}`} className="font-medium text-ink hover:underline">{post.author}</Link>
        <p className="mt-1 font-mono">joined {post.authorJoined}</p>
        <p className="font-mono">{post.authorPostCount} posts</p>
      </aside>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-mono text-[0.65rem] text-faint">#{post.id} · {meta}</p>
        <div className="mt-2"><Body post={post} /></div>
        {controls && <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">{controls}</div>}
      </div>
    </article>
  );
}

export function ReactionBar({ post, canReact, backPath }: { post: PostView; canReact: boolean; backPath: string }) {
  const { like, honk, mine } = post.reactions;
  if (!canReact) {
    return (like > 0 || honk > 0)
      ? <span className="font-mono text-xs text-muted">👍 {like} · 🪿 {honk}</span>
      : null;
  }
  return (
    <span className="flex items-center gap-2">
      {(["like", "honk"] as const).map((kind) => (
        <form key={kind} action={reactAction}>
          <input type="hidden" name="postId" value={post.id} />
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="back" value={backPath} />
          <button type="submit"
            className={clsx("border border-line px-2 py-0.5 font-mono text-xs hover:border-line-soft", mine === kind && "font-bold")}>
            {kind === "like" ? `👍 ${like}` : `🪿 ${honk}`}
          </button>
        </form>
      ))}
    </span>
  );
}

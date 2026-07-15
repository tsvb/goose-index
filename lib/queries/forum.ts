import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { POSTS_PER_PAGE, THREADS_PER_PAGE } from "@/lib/forum/constants";

function allRows(result: unknown): Record<string, unknown>[] {
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  return rows as Record<string, unknown>[];
}
const num = (v: unknown): number => Number(v ?? 0);
const str = (v: unknown): string => String(v ?? "");
const strOrNull = (v: unknown): string | null => (v == null ? null : String(v));
const bool = (v: unknown): boolean => v === true || v === "t";
/** User-supplied page numbers arrive as anything; queries only accept whole pages ≥ 1. */
const cleanPage = (page: number): number => (Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1);

export type BoardLastPost = { threadId: number; threadSlug: string; threadTitle: string; author: string; at: string };
export type BoardSummary = { id: number; slug: string; title: string; description: string; threadCount: number; postCount: number; lastPost: BoardLastPost | null };
export type BoardIndexCategory = { id: number; title: string; boards: BoardSummary[] };
export type BoardInfo = { id: number; slug: string; title: string; description: string; threadCount: number };
export type ThreadRow = { id: number; slug: string; title: string; author: string; replyCount: number; pinned: boolean; locked: boolean; lastPostAuthor: string; lastPostAt: string; unread: boolean };
export type ThreadInfo = { id: number; slug: string; title: string; boardId: number; boardSlug: string; boardTitle: string; locked: boolean; pinned: boolean; replyCount: number };
export type PostView = { id: number; authorId: number; author: string; authorPostCount: number; authorJoined: string; authorSignature: string | null; body: string | null; deleted: boolean; at: string; editedAt: string | null };
export type MemberProfile = { username: string; role: string; joined: string; postCount: number; signature: string | null; recent: { postId: number; threadId: number; threadSlug: string; threadTitle: string; at: string; snippet: string }[] };

export async function getBoardIndex(): Promise<BoardIndexCategory[]> {
  const rows = allRows(await db.execute(sql`
    select c.id as category_id, c.title as category_title,
           b.id, b.slug, b.title, b.description, b.thread_count, b.post_count,
           t.id as lt_thread_id, t.slug as lt_thread_slug, t.title as lt_thread_title,
           u.username as lt_author,
           to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') as lt_at
    from forum_categories c
    join forum_boards b on b.category_id = c.id
    left join forum_posts p on p.id = b.last_post_id
    left join forum_threads t on t.id = p.thread_id
    left join users u on u.id = p.author_id
    order by c.position asc, b.position asc
  `));
  const cats: BoardIndexCategory[] = [];
  for (const r of rows) {
    let cat = cats.find((c) => c.id === num(r.category_id));
    if (!cat) {
      cat = { id: num(r.category_id), title: str(r.category_title), boards: [] };
      cats.push(cat);
    }
    cat.boards.push({
      id: num(r.id), slug: str(r.slug), title: str(r.title), description: str(r.description),
      threadCount: num(r.thread_count), postCount: num(r.post_count),
      lastPost: r.lt_thread_id == null ? null : {
        threadId: num(r.lt_thread_id), threadSlug: str(r.lt_thread_slug),
        threadTitle: str(r.lt_thread_title), author: str(r.lt_author), at: str(r.lt_at),
      },
    });
  }
  return cats;
}

export async function getBoard(slug: string): Promise<BoardInfo | null> {
  const rows = allRows(await db.execute(sql`
    select id, slug, title, description, thread_count from forum_boards where slug = ${slug}
  `));
  if (rows.length === 0) return null;
  const r = rows[0];
  return { id: num(r.id), slug: str(r.slug), title: str(r.title), description: str(r.description), threadCount: num(r.thread_count) };
}

export async function getThreadRows(boardId: number, page: number): Promise<ThreadRow[]> {
  const offset = (cleanPage(page) - 1) * THREADS_PER_PAGE;
  const rows = allRows(await db.execute(sql`
    select t.id, t.slug, t.title, t.reply_count, t.pinned, t.locked,
           a.username as author, lu.username as last_post_author,
           to_char(t.last_post_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') as last_post_at
    from forum_threads t
    join users a on a.id = t.author_id
    left join forum_posts lp on lp.id = t.last_post_id
    left join users lu on lu.id = lp.author_id
    where t.board_id = ${boardId}
    order by t.pinned desc, t.last_post_at desc, t.id desc
    limit ${THREADS_PER_PAGE} offset ${offset}
  `));
  return rows.map((r) => ({
    id: num(r.id), slug: str(r.slug), title: str(r.title), author: str(r.author),
    replyCount: num(r.reply_count), pinned: bool(r.pinned), locked: bool(r.locked),
    lastPostAuthor: str(r.last_post_author), lastPostAt: str(r.last_post_at),
    unread: false, // Task 19 wires the signed-in viewer
  }));
}

export async function getThread(id: number): Promise<ThreadInfo | null> {
  const rows = allRows(await db.execute(sql`
    select t.id, t.slug, t.title, t.locked, t.pinned, t.reply_count,
           b.id as board_id, b.slug as board_slug, b.title as board_title
    from forum_threads t join forum_boards b on b.id = t.board_id
    where t.id = ${id}
  `));
  if (rows.length === 0) return null;
  const r = rows[0];
  return {
    id: num(r.id), slug: str(r.slug), title: str(r.title),
    boardId: num(r.board_id), boardSlug: str(r.board_slug), boardTitle: str(r.board_title),
    locked: bool(r.locked), pinned: bool(r.pinned), replyCount: num(r.reply_count),
  };
}

export async function getPosts(
  threadId: number, page: number, opts: { includeDeletedBodies?: boolean } = {},
): Promise<PostView[]> {
  const offset = (cleanPage(page) - 1) * POSTS_PER_PAGE;
  const rows = allRows(await db.execute(sql`
    select p.id, p.author_id, p.body, p.deleted_at,
           to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') as at,
           to_char(p.edited_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') as edited_at,
           u.username as author, u.post_count as author_post_count, u.signature as author_signature,
           to_char(u.joined_at at time zone 'UTC', 'YYYY-MM-DD') as author_joined
    from forum_posts p join users u on u.id = p.author_id
    where p.thread_id = ${threadId}
    order by p.id asc
    limit ${POSTS_PER_PAGE} offset ${offset}
  `));
  return rows.map((r) => {
    const deleted = r.deleted_at != null;
    return {
      id: num(r.id), authorId: num(r.author_id), author: str(r.author),
      authorPostCount: num(r.author_post_count), authorJoined: str(r.author_joined),
      authorSignature: strOrNull(r.author_signature),
      body: deleted && !opts.includeDeletedBodies ? null : str(r.body),
      deleted, at: str(r.at), editedAt: strOrNull(r.edited_at),
    };
  });
}

export async function getMemberProfile(usernameLower: string): Promise<MemberProfile | null> {
  const urows = allRows(await db.execute(sql`
    select id, username, role, post_count, signature,
           to_char(joined_at at time zone 'UTC', 'YYYY-MM-DD') as joined
    from users where username_lower = ${usernameLower}
  `));
  if (urows.length === 0) return null;
  const u = urows[0];
  const prows = allRows(await db.execute(sql`
    select p.id as post_id, t.id as thread_id, t.slug as thread_slug, t.title as thread_title,
           to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI') as at,
           left(p.body, 200) as snippet
    from forum_posts p join forum_threads t on t.id = p.thread_id
    where p.author_id = ${num(u.id)} and p.deleted_at is null
    order by p.id desc
    limit 10
  `));
  return {
    username: str(u.username), role: str(u.role), joined: str(u.joined),
    postCount: num(u.post_count), signature: strOrNull(u.signature),
    recent: prows.map((r) => ({
      postId: num(r.post_id), threadId: num(r.thread_id), threadSlug: str(r.thread_slug),
      threadTitle: str(r.thread_title), at: str(r.at), snippet: str(r.snippet),
    })),
  };
}

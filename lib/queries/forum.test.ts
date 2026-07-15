import { describe, it, expect, afterAll, vi, beforeAll } from "vitest";
import { makeTestDb } from "@/db/testing";
import { forumBoards, forumThreads, forumPosts, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth/service";

let _testDb: Awaited<ReturnType<typeof makeTestDb>>["db"] | null = null;
vi.mock("@/db/client", () => ({
  db: new Proxy({} as Record<string | symbol, unknown>, {
    get(_t, prop) {
      if (!_testDb) throw new Error("Test db not initialised");
      const real = _testDb as unknown as Record<string | symbol, unknown>;
      const val = real[prop];
      return typeof val === "function" ? val.bind(real) : val;
    },
  }),
}));
const ctx = await makeTestDb();
_testDb = ctx.db;
afterAll(() => ctx.close());

const { createThread, createPost } = await import("@/lib/forum/mutations");
const { getBoardIndex, getBoard, getThreadRows, getThread, getPosts, getMemberProfile } = await import("./forum");

let tim: SessionUser;
let boardId = 0;
let threadId = 0;

beforeAll(async () => {
  const [u] = await ctx.db.insert(users).values({
    username: "Tim", usernameLower: "tim", emailLower: "tim@x.co", signature: "[i]honk[/i]",
  }).returning();
  tim = { id: u.id, username: u.username, role: "member", signature: u.signature, postCount: 0,
    joinedAt: u.joinedAt, markAllReadAt: null, bannedAt: null, bannedReason: null };
  boardId = (await ctx.db.select({ id: forumBoards.id }).from(forumBoards).where(eq(forumBoards.slug, "tour-talk")))[0].id;
  const t = await createThread(tim, boardId, "First thread", "the [b]op[/b]");
  if (!t.ok) throw new Error("seed failed");
  threadId = t.value.threadId;
  await createPost(tim, threadId, "first reply");
  const t2 = await createThread(tim, boardId, "Pinned thread", "pin me");
  if (!t2.ok) throw new Error("seed failed");
  await ctx.db.update(forumThreads).set({ pinned: true }).where(eq(forumThreads.id, t2.value.threadId));
});

describe("getBoardIndex", () => {
  it("groups boards under categories with last-post info", async () => {
    const cats = await getBoardIndex();
    expect(cats.map((c) => c.title)).toEqual(["The Music", "Community"]);
    const tourTalk = cats[0].boards.find((b) => b.slug === "tour-talk")!;
    expect(tourTalk.threadCount).toBe(2);
    expect(tourTalk.postCount).toBe(3);
    expect(tourTalk.lastPost?.author).toBe("Tim");
    expect(tourTalk.lastPost?.at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    const empty = cats[1].boards.find((b) => b.slug === "off-topic")!;
    expect(empty.lastPost).toBeNull();
  });
});

describe("getBoard + getThreadRows", () => {
  it("resolves a board by slug; unknown → null", async () => {
    expect((await getBoard("tour-talk"))?.id).toBe(boardId);
    expect(await getBoard("nope")).toBeNull();
  });
  it("lists pinned first, then by last-post desc", async () => {
    const rows = await getThreadRows(boardId, 1);
    expect(rows[0].title).toBe("Pinned thread");
    expect(rows[0].pinned).toBe(true);
    expect(rows[1].title).toBe("First thread");
    expect(rows[1].replyCount).toBe(1);
    expect(rows[1].lastPostAuthor).toBe("Tim");
    expect(rows.every((r) => r.unread === false)).toBe(true);
  });
});

describe("getThread + getPosts", () => {
  it("returns thread info with board context", async () => {
    const t = await getThread(threadId);
    expect(t?.title).toBe("First thread");
    expect(t?.boardSlug).toBe("tour-talk");
    expect(t?.boardTitle).toBe("Tour Talk");
    expect(await getThread(999999)).toBeNull();
  });
  it("pages posts oldest-first with author info", async () => {
    const posts = await getPosts(threadId, 1);
    expect(posts).toHaveLength(2);
    expect(posts[0].body).toBe("the [b]op[/b]");
    expect(posts[0].author).toBe("Tim");
    expect(posts[0].authorSignature).toBe("[i]honk[/i]");
    expect(posts[0].authorJoined).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(posts[1].body).toBe("first reply");
  });
  it("tombstones hide the body unless includeDeletedBodies", async () => {
    const posts = await getPosts(threadId, 1);
    await ctx.db.update(forumPosts).set({ deletedAt: new Date() }).where(eq(forumPosts.id, posts[1].id));
    const after = await getPosts(threadId, 1);
    expect(after[1].deleted).toBe(true);
    expect(after[1].body).toBeNull();
    const admin = await getPosts(threadId, 1, { includeDeletedBodies: true });
    expect(admin[1].body).toBe("first reply");
    await ctx.db.update(forumPosts).set({ deletedAt: null }).where(eq(forumPosts.id, posts[1].id));
  });
  it("tolerates garbage page numbers instead of throwing", async () => {
    await expect(getThreadRows(boardId, NaN)).resolves.toBeDefined();
    await expect(getPosts(threadId, 2.5)).resolves.toBeDefined();
    const page1 = await getPosts(threadId, 1);
    expect(await getPosts(threadId, 0)).toEqual(page1); // clamps up to 1
  });
  it("counts reactions and reports the viewer's own", async () => {
    const { forumReactions } = await import("@/db/schema");
    const [other] = await ctx.db.insert(users).values({
      username: "Reactor", usernameLower: "reactor", emailLower: "r@x.co",
    }).returning({ id: users.id });
    const posts = await getPosts(threadId, 1);
    await ctx.db.insert(forumReactions).values([
      { postId: posts[0].id, userId: other.id, kind: "like" },
    ]);
    const anon = await getPosts(threadId, 1);
    expect(anon[0].reactions).toEqual({ like: 1, honk: 0, mine: null });
    const viewed = await getPosts(threadId, 1, { viewerId: other.id });
    expect(viewed[0].reactions.mine).toBe("like");
  });
});

describe("getMemberProfile", () => {
  it("returns profile with recent posts; unknown → null", async () => {
    const p = await getMemberProfile("tim");
    expect(p?.username).toBe("Tim");
    expect(p?.postCount).toBe(3);
    expect(p?.recent.length).toBeGreaterThan(0);
    expect(p?.recent[0].threadTitle).toBeTruthy();
    expect(await getMemberProfile("ghost")).toBeNull();
  });
});

describe("getPostForEdit", () => {
  it("returns raw body + ownership; null for unknown", async () => {
    const posts = await getPosts(threadId, 1);
    const { getPostForEdit } = await import("./forum");
    const p = await getPostForEdit(posts[0].id);
    expect(p?.body).toBe("the [b]op[/b]");
    expect(p?.authorId).toBe(tim.id);
    expect(p?.author).toBe("Tim");
    expect(p?.threadTitle).toBe("First thread");
    expect(await getPostForEdit(999999)).toBeNull();
  });
});

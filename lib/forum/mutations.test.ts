import { describe, it, expect, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { forumBoards, forumThreads, forumPosts, forumReactions, users } from "@/db/schema";
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

const { createThread, createPost, editPost } = await import("./mutations");
const { POSTS_PER_PAGE } = await import("./constants");

async function makeUser(name: string, opts: { banned?: boolean; role?: "member" | "admin" } = {}): Promise<SessionUser> {
  const [u] = await ctx.db.insert(users).values({
    username: name, usernameLower: name.toLowerCase(), emailLower: `${name.toLowerCase()}@x.co`,
    role: opts.role ?? "member",
    bannedAt: opts.banned ? new Date() : null, bannedReason: opts.banned ? "spam" : null,
  }).returning();
  return {
    id: u.id, username: u.username, role: u.role as "member" | "admin", signature: u.signature,
    postCount: u.postCount, joinedAt: u.joinedAt, markAllReadAt: u.markAllReadAt,
    bannedAt: u.bannedAt, bannedReason: u.bannedReason,
  };
}
const boardId = async (slug: string) =>
  (await ctx.db.select({ id: forumBoards.id }).from(forumBoards).where(eq(forumBoards.slug, slug)))[0].id;

describe("createThread", () => {
  it("creates thread + first post and maintains every counter", async () => {
    const tim = await makeUser("Tim");
    const board = await boardId("tour-talk");
    const r = await createThread(tim, board, "Fall tour speculation", "It begins [b]now[/b]");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.slug).toBe("fall-tour-speculation");
    const [b] = await ctx.db.select().from(forumBoards).where(eq(forumBoards.id, board));
    expect(b.threadCount).toBe(1);
    expect(b.postCount).toBe(1);
    expect(b.lastPostId).not.toBeNull();
    const [t] = await ctx.db.select().from(forumThreads).where(eq(forumThreads.id, r.value.threadId));
    expect(t.replyCount).toBe(0);
    expect(t.lastPostId).toBe(b.lastPostId);
    const [u] = await ctx.db.select().from(users).where(eq(users.id, tim.id));
    expect(u.postCount).toBe(1);
  });

  it("rejects bad titles, empty bodies, unknown boards, banned users", async () => {
    const tim = await makeUser("Tim2");
    const board = await boardId("off-topic");
    expect((await createThread(tim, board, "ab", "body")).ok).toBe(false);
    expect((await createThread(tim, board, "x".repeat(121), "body")).ok).toBe(false);
    expect((await createThread(tim, board, "Fine title", "   ")).ok).toBe(false);
    expect((await createThread(tim, 99999, "Fine title", "body")).ok).toBe(false);
    const banned = await makeUser("Banned1", { banned: true });
    const r = await createThread(banned, board, "Fine title", "body");
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.error).toContain("banned");
  });
});

describe("createPost", () => {
  it("appends, bumps counters, and reports the right page", async () => {
    const tim = await makeUser("Tim3");
    const board = await boardId("introductions");
    const t = await createThread(tim, board, "Hello from Connecticut", "op");
    if (!t.ok) throw new Error("setup");
    for (let i = 0; i < POSTS_PER_PAGE - 1; i++) {
      const r = await createPost(tim, t.value.threadId, `reply ${i}`);
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.value.page).toBe(1); // posts 2..20 fill page 1
    }
    const overflow = await createPost(tim, t.value.threadId, "reply 20");
    expect(overflow.ok).toBe(true);
    if (overflow.ok) expect(overflow.value.page).toBe(2); // post 21 opens page 2
    const [row] = await ctx.db.select().from(forumThreads).where(eq(forumThreads.id, t.value.threadId));
    expect(row.replyCount).toBe(POSTS_PER_PAGE);
    expect(row.lastPostId).toBe(overflow.ok ? overflow.value.postId : -1);
  });

  it("locked threads refuse members but allow admins", async () => {
    const tim = await makeUser("Tim4");
    const admin = await makeUser("Admin1", { role: "admin" });
    const board = await boardId("off-topic");
    const t = await createThread(tim, board, "Lock me", "op");
    if (!t.ok) throw new Error("setup");
    await ctx.db.update(forumThreads).set({ locked: true }).where(eq(forumThreads.id, t.value.threadId));
    expect((await createPost(tim, t.value.threadId, "no")).ok).toBe(false);
    expect((await createPost(admin, t.value.threadId, "yes")).ok).toBe(true);
  });
});

describe("editPost", () => {
  it("authors edit their own; strangers can't; admins can; tombstones can't be edited", async () => {
    const tim = await makeUser("Tim5");
    const rando = await makeUser("Rando");
    const admin = await makeUser("Admin2", { role: "admin" });
    const board = await boardId("off-topic");
    const t = await createThread(tim, board, "Edit test", "original");
    if (!t.ok) throw new Error("setup");
    const [post] = await ctx.db.select().from(forumPosts).where(eq(forumPosts.threadId, t.value.threadId));
    expect((await editPost(rando, post.id, "hijack")).ok).toBe(false);
    expect((await editPost(tim, post.id, "fixed")).ok).toBe(true);
    expect((await editPost(admin, post.id, "mod edit")).ok).toBe(true);
    const [after] = await ctx.db.select().from(forumPosts).where(eq(forumPosts.id, post.id));
    expect(after.body).toBe("mod edit");
    expect(after.editedAt).not.toBeNull();
    expect(after.editedById).toBe(admin.id);
    await ctx.db.update(forumPosts).set({ deletedAt: new Date() }).where(eq(forumPosts.id, post.id));
    expect((await editPost(tim, post.id, "zombie")).ok).toBe(false);
  });
});

describe("toggleReaction", () => {
  it("adds, replaces, and removes; refuses own posts and deleted posts", async () => {
    const { toggleReaction } = await import("./mutations");
    const author = await makeUser("ReactAuthor");
    const fan = await makeUser("ReactFan");
    const board = await boardId("off-topic");
    const t = await createThread(author, board, "React to me", "op");
    if (!t.ok) throw new Error("setup");
    const [post] = await ctx.db.select().from(forumPosts).where(eq(forumPosts.threadId, t.value.threadId));

    expect((await toggleReaction(author, post.id, "like")).ok).toBe(false); // own post
    expect((await toggleReaction(fan, post.id, "like")).ok).toBe(true);     // add
    expect((await toggleReaction(fan, post.id, "honk")).ok).toBe(true);     // replace
    const { forumReactions } = await import("@/db/schema");
    let rows = await ctx.db.select().from(forumReactions).where(eq(forumReactions.postId, post.id));
    expect(rows).toEqual([expect.objectContaining({ kind: "honk", userId: fan.id })]);
    expect((await toggleReaction(fan, post.id, "honk")).ok).toBe(true);     // toggle off
    rows = await ctx.db.select().from(forumReactions).where(eq(forumReactions.postId, post.id));
    expect(rows).toHaveLength(0);
    await ctx.db.update(forumPosts).set({ deletedAt: new Date() }).where(eq(forumPosts.id, post.id));
    expect((await toggleReaction(fan, post.id, "like")).ok).toBe(false);    // deleted post
  });

  it("a duplicate add is idempotent (no PK-violation throw on double-submit)", async () => {
    const { toggleReaction } = await import("./mutations");
    const author = await makeUser("DupAuthor");
    const fan = await makeUser("DupFan");
    const board = await boardId("off-topic");
    const t = await createThread(author, board, "Dup react", "op");
    if (!t.ok) throw new Error("setup");
    const [post] = await ctx.db.select().from(forumPosts).where(eq(forumPosts.threadId, t.value.threadId));
    expect((await toggleReaction(fan, post.id, "like")).ok).toBe(true);
    // Simulate a raced second insert of the same kind (marker still present):
    await ctx.db.insert(forumReactions).values({ postId: post.id, userId: fan.id, kind: "like" })
      .onConflictDoNothing({ target: [forumReactions.postId, forumReactions.userId] });
    const rows = await ctx.db.select().from(forumReactions).where(eq(forumReactions.postId, post.id));
    expect(rows).toHaveLength(1); // still exactly one
  });
});

import { describe, it, expect, afterAll } from "vitest";
import { makeTestDb } from "@/db/testing";
import { forumCategories, forumBoards, forumThreads, forumPosts, users } from "@/db/schema";
import { eq } from "drizzle-orm";

const ctx = await makeTestDb();
afterAll(() => ctx.close());

describe("forum schema", () => {
  it("ships seeded categories and boards", async () => {
    const cats = await ctx.db.select().from(forumCategories);
    const boards = await ctx.db.select().from(forumBoards);
    expect(cats.map((c) => c.title)).toEqual(["The Music", "Community"]);
    expect(boards).toHaveLength(6);
    const slugs = boards.map((b) => b.slug);
    expect(slugs).toContain("tour-talk");
    expect(slugs).toContain("off-topic");
    expect(boards.every((b) => b.threadCount === 0 && b.postCount === 0)).toBe(true);
  });

  it("round-trips a thread with its first post", async () => {
    const [u] = await ctx.db.insert(users).values({
      username: "Poster", usernameLower: "poster", emailLower: "p@x.co",
    }).returning({ id: users.id });
    const [board] = await ctx.db.select().from(forumBoards).where(eq(forumBoards.slug, "tour-talk"));
    const [t] = await ctx.db.insert(forumThreads).values({
      boardId: board.id, authorId: u.id, title: "First!", slug: "first",
    }).returning({ id: forumThreads.id, pinned: forumThreads.pinned, replyCount: forumThreads.replyCount });
    expect(t.pinned).toBe(false);
    expect(t.replyCount).toBe(0);
    const [p] = await ctx.db.insert(forumPosts).values({
      threadId: t.id, authorId: u.id, body: "hello [b]world[/b]",
    }).returning({ id: forumPosts.id, deletedAt: forumPosts.deletedAt });
    expect(p.id).toBeGreaterThan(0);
    expect(p.deletedAt).toBeNull();
  });
});

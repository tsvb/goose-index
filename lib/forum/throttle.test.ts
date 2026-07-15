import { describe, it, expect, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { forumBoards, forumPosts, forumThreads, users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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

const { postGate, threadGate } = await import("./throttle");
const { createThread, createPost } = await import("./mutations");

async function makeUser(name: string, joinedAgoMs: number): Promise<SessionUser> {
  const [u] = await ctx.db.insert(users).values({
    username: name, usernameLower: name.toLowerCase(), emailLower: `${name.toLowerCase()}@x.co`,
    joinedAt: new Date(Date.now() - joinedAgoMs),
  }).returning();
  return { id: u.id, username: u.username, role: "member", signature: null, postCount: 0,
    joinedAt: u.joinedAt, markAllReadAt: null, bannedAt: null, bannedReason: null };
}
const DAY = 24 * 3_600_000;
const boardId = async () =>
  (await ctx.db.select({ id: forumBoards.id }).from(forumBoards).where(eq(forumBoards.slug, "off-topic")))[0].id;
/** Backdate the user's newest post so the interval throttle doesn't trip. */
async function coolDown(userId: number, seconds: number) {
  await ctx.db.execute(sql`
    update forum_posts set created_at = now() - interval '1 second' * ${seconds}
    where id = (select max(id) from forum_posts where author_id = ${userId})
  `);
}

describe("postGate", () => {
  it("enforces the 30s/60s interval by account age", async () => {
    const vet = await makeUser("Vet", 30 * DAY);
    const noob = await makeUser("Noob", 3_600_000);
    const b = await boardId();
    const vt = await createThread(vet, b, "Vet thread", "op");
    const nt = await createThread(noob, b, "Noob thread", "op");
    if (!vt.ok || !nt.ok) throw new Error("setup");

    expect((await postGate(vet, "hi")).ok).toBe(false);   // 0s since last post
    await coolDown(vet.id, 45);
    expect((await postGate(vet, "hi")).ok).toBe(true);    // 45s ≥ 30s
    await coolDown(noob.id, 45);
    expect((await postGate(noob, "hi")).ok).toBe(false);  // 45s < 60s for new accounts
    await coolDown(noob.id, 90);
    expect((await postGate(noob, "hi")).ok).toBe(true);
  });

  it("caps links for new accounts", async () => {
    const noob = await makeUser("Linky", 3_600_000);
    const three = "https://a.co https://b.co https://c.co";
    expect((await postGate(noob, three)).ok).toBe(false);
    const vet = await makeUser("Linkvet", 30 * DAY);
    expect((await postGate(vet, three)).ok).toBe(true);
  });
});

describe("threadGate", () => {
  it("caps new accounts at 3 threads/day", async () => {
    const noob = await makeUser("Thready", 3_600_000);
    const b = await boardId();
    for (let i = 0; i < 3; i++) {
      const r = await createThread(noob, b, `Thread number ${i}`, "op");
      expect(r.ok).toBe(true);
      await coolDown(noob.id, 120); // clear the interval throttle between creates
    }
    expect((await threadGate(noob)).ok).toBe(false);
  });
});

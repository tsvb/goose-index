import { describe, it, expect, afterAll } from "vitest";
import { makeTestDb } from "@/db/testing";
import { users, sessions, loginTokens } from "@/db/schema";

const ctx = await makeTestDb();
afterAll(() => ctx.close());

describe("identity schema", () => {
  it("round-trips a user, a session, and a login token", async () => {
    const [u] = await ctx.db.insert(users).values({
      username: "HonkFan", usernameLower: "honkfan", emailLower: "honk@example.com",
    }).returning({ id: users.id, role: users.role, postCount: users.postCount });
    expect(u.id).toBeGreaterThan(0);
    expect(u.role).toBe("member");
    expect(u.postCount).toBe(0);

    await ctx.db.insert(sessions).values({
      tokenHash: "abc", userId: u.id, expiresAt: new Date(Date.now() + 1000),
    });
    await ctx.db.insert(loginTokens).values({
      tokenHash: "def", purpose: "login", emailLower: "honk@example.com", userId: u.id,
      expiresAt: new Date(Date.now() + 1000),
    });
    const s = await ctx.db.select().from(sessions);
    expect(s).toHaveLength(1);
  });

  it("rejects duplicate username_lower and email_lower", async () => {
    await expect(ctx.db.insert(users).values({
      username: "HONKFAN", usernameLower: "honkfan", emailLower: "other@example.com",
    })).rejects.toThrow();
    await expect(ctx.db.insert(users).values({
      username: "Other", usernameLower: "other", emailLower: "honk@example.com",
    })).rejects.toThrow();
  });
});

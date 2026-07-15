import { describe, it, expect, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { loginTokens, users } from "@/db/schema";
import { hashToken } from "./crypto";

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

const { requestSignup, requestLogin, requestEmailChange } = await import("./service");

describe("requestSignup", () => {
  it("issues a hashed single-purpose signup token", async () => {
    const r = await requestSignup("HonkFan", "honk@example.com", "1.2.3.4");
    expect(r.status).toBe("sent");
    if (r.status !== "sent") return;
    expect(r.kind).toBe("signup");
    const rows = await ctx.db.select().from(loginTokens);
    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).toBe(hashToken(r.token));
    expect(rows[0].tokenHash).not.toBe(r.token); // raw token never stored
    expect(rows[0].purpose).toBe("signup");
    expect(rows[0].username).toBe("HonkFan");
    expect(rows[0].ip).toBe("1.2.3.4");
  });

  it("rejects an invalid username visibly", async () => {
    const r = await requestSignup("x", "a@b.co", null);
    expect(r).toMatchObject({ status: "error" });
  });

  it("rejects a taken username visibly (case-insensitive)", async () => {
    await ctx.db.insert(users).values({ username: "Taken", usernameLower: "taken", emailLower: "t@x.co" });
    const r = await requestSignup("TAKEN", "new@x.co", null);
    expect(r).toMatchObject({ status: "error" });
  });

  it("switches to a login token when the email already has an account", async () => {
    const r = await requestSignup("Brandnew", "t@x.co", null); // t@x.co registered above
    expect(r).toMatchObject({ status: "sent", kind: "login" });
  });
});

describe("requestLogin", () => {
  it("is silent for unknown emails", async () => {
    expect(await requestLogin("ghost@x.co", null)).toEqual({ status: "silent" });
  });
  it("issues a login token for a known email", async () => {
    const r = await requestLogin("t@x.co", null);
    expect(r.status).toBe("sent");
  });
});

describe("requestEmailChange", () => {
  it("errors when the email belongs to another account", async () => {
    const [u] = await ctx.db.insert(users).values({ username: "Second", usernameLower: "second", emailLower: "second@x.co" }).returning({ id: users.id });
    const r = await requestEmailChange(u.id, "t@x.co");
    expect(r.status).toBe("error");
  });
  it("issues an email-change token otherwise", async () => {
    const [u] = await ctx.db.select({ id: users.id }).from(users);
    const r = await requestEmailChange(u.id, "fresh@x.co");
    expect(r.status).toBe("sent");
  });
});

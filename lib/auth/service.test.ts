import { describe, it, expect, afterAll, vi } from "vitest";
import { makeTestDb } from "@/db/testing";
import { loginTokens, users, sessions } from "@/db/schema";
import { hashToken } from "./crypto";
import { eq } from "drizzle-orm";

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

const { requestSignup, requestLogin, requestEmailChange, verifyToken, getSessionUser, deleteSession } = await import("./service");

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

describe("verifyToken — signup", () => {
  it("creates user + session; token is single-use", async () => {
    const r = await requestSignup("Verifyme", "verify@x.co", null);
    if (r.status !== "sent") throw new Error("setup");
    const v = await verifyToken(r.token);
    expect(v.status).toBe("ok");
    if (v.status !== "ok") return;
    expect(v.username).toBe("Verifyme");
    const me = await getSessionUser(v.sessionToken);
    expect(me?.username).toBe("Verifyme");
    expect(me?.role).toBe("member");
    // second use fails
    expect((await verifyToken(r.token)).status).toBe("used");
  });

  it("username race → username-taken, token survives, override works", async () => {
    const r = await requestSignup("Racer", "racer@x.co", null);
    if (r.status !== "sent") throw new Error("setup");
    await ctx.db.insert(users).values({ username: "Racer2", usernameLower: "racer", emailLower: "sniped@x.co" });
    expect((await verifyToken(r.token)).status).toBe("username-taken");
    const v = await verifyToken(r.token, "Racer_alt");
    expect(v.status).toBe("ok");
    if (v.status === "ok") expect(v.username).toBe("Racer_alt");
  });

  it("returns username-taken when the insert itself hits the unique constraint", async () => {
    const r = await requestSignup("Racewinner", "racewinner@x.co", null);
    if (r.status !== "sent") throw new Error("setup");
    // Simulate losing the race: the name is taken AFTER the token was issued.
    await ctx.db.insert(users).values({ username: "Racewinner", usernameLower: "racewinner", emailLower: "sniper@x.co" });
    expect((await verifyToken(r.token)).status).toBe("username-taken");
  });

  it("expired and garbage tokens are rejected", async () => {
    const r = await requestSignup("Expiry", "expiry@x.co", null);
    if (r.status !== "sent") throw new Error("setup");
    await ctx.db.update(loginTokens).set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(loginTokens.tokenHash, hashToken(r.token)));
    expect((await verifyToken(r.token)).status).toBe("expired");
    expect((await verifyToken("garbage")).status).toBe("invalid");
  });
});

describe("verifyToken — email-change race", () => {
  it("returns invalid (not a throw) when the new email got taken before the link was confirmed", async () => {
    await ctx.db.insert(users).values({ username: "Changer", usernameLower: "changer", emailLower: "changer@x.co" });
    const [u] = await ctx.db.select({ id: users.id }).from(users).where(eq(users.usernameLower, "changer"));
    const r = await requestEmailChange(u.id, "sniped-email@x.co");
    if (r.status !== "sent") throw new Error("setup");
    // Someone else claims the target email address after the token was issued but before it's confirmed.
    await ctx.db.insert(users).values({ username: "Sniper", usernameLower: "sniper", emailLower: "sniped-email@x.co" });
    await expect(verifyToken(r.token)).resolves.toEqual({ status: "invalid" });
  });
});

describe("sessions", () => {
  it("expired sessions are deleted and return null", async () => {
    // Distinct email per test — the issuance limiter caps a single email at 3 tokens/hour,
    // and "verify@x.co" already spent its budget in the describe block above.
    await ctx.db.insert(users).values({ username: "Sess1", usernameLower: "sess1", emailLower: "sess1@x.co" });
    const r = await requestLogin("sess1@x.co", null);
    if (r.status !== "sent") throw new Error("setup");
    const v = await verifyToken(r.token);
    if (v.status !== "ok") throw new Error("setup");
    await ctx.db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(sessions.tokenHash, hashToken(v.sessionToken)));
    expect(await getSessionUser(v.sessionToken)).toBeNull();
    expect(await ctx.db.select().from(sessions).then(rows =>
      rows.filter(s => s.tokenHash === hashToken(v.sessionToken)))).toHaveLength(0);
  });

  it("old sessions slide forward on use", async () => {
    await ctx.db.insert(users).values({ username: "Sess2", usernameLower: "sess2", emailLower: "sess2@x.co" });
    const r = await requestLogin("sess2@x.co", null);
    if (r.status !== "sent") throw new Error("setup");
    const v = await verifyToken(r.token);
    if (v.status !== "ok") throw new Error("setup");
    const soon = new Date(Date.now() + 1 * 24 * 3_600_000); // 1 day left
    await ctx.db.update(sessions).set({ expiresAt: soon }).where(eq(sessions.tokenHash, hashToken(v.sessionToken)));
    await getSessionUser(v.sessionToken);
    const [row] = (await ctx.db.select().from(sessions)).filter(s => s.tokenHash === hashToken(v.sessionToken));
    expect(row.expiresAt.getTime()).toBeGreaterThan(soon.getTime());
  });

  it("deleteSession logs out", async () => {
    await ctx.db.insert(users).values({ username: "Sess3", usernameLower: "sess3", emailLower: "sess3@x.co" });
    const r = await requestLogin("sess3@x.co", null);
    if (r.status !== "sent") throw new Error("setup");
    const v = await verifyToken(r.token);
    if (v.status !== "ok") throw new Error("setup");
    await deleteSession(v.sessionToken);
    expect(await getSessionUser(v.sessionToken)).toBeNull();
  });
});

describe("updateSignature", () => {
  it("saves a trimmed signature and clears an empty one", async () => {
    const [u] = await ctx.db.select({ id: users.id }).from(users);
    expect(await (await import("./service")).updateSignature(u.id, "  We honk at dawn  ")).toEqual({ ok: true });
    let [row] = await ctx.db.select({ signature: users.signature }).from(users).where(eq(users.id, u.id));
    expect(row.signature).toBe("We honk at dawn");
    await (await import("./service")).updateSignature(u.id, "   ");
    [row] = await ctx.db.select({ signature: users.signature }).from(users).where(eq(users.id, u.id));
    expect(row.signature).toBeNull();
  });
  it("rejects signatures over 200 chars", async () => {
    const [u] = await ctx.db.select({ id: users.id }).from(users);
    const r = await (await import("./service")).updateSignature(u.id, "x".repeat(201));
    expect(r.ok).toBe(false);
  });
});

describe("issuance rate limits", () => {
  it("caps links per email at 3/hour", async () => {
    await ctx.db.insert(users).values({
      username: "Limited", usernameLower: "limited", emailLower: "limited@x.co",
    });
    for (let i = 0; i < 3; i++) {
      const r = await requestLogin("limited@x.co", "9.9.9.9");
      expect(r.status).toBe("sent");
    }
    const fourth = await requestLogin("limited@x.co", "9.9.9.9");
    // Rate-limited login must be indistinguishable from an unknown email (enumeration-safe),
    // not a visible "error" state — see the enumeration-safety test below.
    expect(fourth.status).toBe("silent");
  });

  it("login rate-limit is enumeration-safe: throttled real email looks identical to unknown", async () => {
    await ctx.db.insert(users).values({ username: "RealUser", usernameLower: "realuser", emailLower: "realuser@x.co" });
    const outcomes: string[] = [];
    for (let i = 0; i < 5; i++) outcomes.push((await requestLogin("realuser@x.co", "7.7.7.7")).status);
    // first 3 send, then throttled — but throttled must read as "silent", never "error"
    expect(outcomes.filter((s) => s === "error")).toHaveLength(0);
    expect(outcomes).toContain("sent");
    expect(outcomes).toContain("silent");
    // an unknown email is also "silent" — indistinguishable
    expect((await requestLogin("ghost-never@x.co", "7.7.7.7")).status).toBe("silent");
  });
});

import { db } from "@/db/client";
import { users, sessions, loginTokens } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { newToken, hashToken } from "./crypto";
import { validateUsername, validateEmail } from "./validate";
import { SIGNATURE_MAX } from "@/lib/forum/constants";

export const TOKEN_TTL_MS = 15 * 60_000;
export const SESSION_TTL_MS = 90 * 24 * 3_600_000;
export const SLIDE_AFTER_MS = 7 * 24 * 3_600_000;

function isUniqueViolation(e: unknown): boolean {
  const err = e as { code?: string; cause?: { code?: string } };
  return err?.code === "23505" || err?.cause?.code === "23505";
}

export type SessionUser = {
  id: number; username: string; role: "member" | "admin"; signature: string | null;
  postCount: number; joinedAt: Date; markAllReadAt: Date | null;
  bannedAt: Date | null; bannedReason: string | null;
};

type Sent = { status: "sent"; kind: "signup" | "login"; token: string; emailLower: string };
type Err = { status: "error"; error: string };

class RateLimitError extends Error {}
const RATE_LIMIT_MSG = "Too many sign-in links requested — try again in a bit.";

async function issueToken(fields: {
  purpose: "signup" | "login" | "email-change"; emailLower: string;
  username?: string; userId?: number; ip?: string | null;
}): Promise<string> {
  const [emailCount] = await db.select({ n: sql<number>`count(*)::int` }).from(loginTokens)
    .where(sql`${loginTokens.emailLower} = ${fields.emailLower} and ${loginTokens.createdAt} > now() - interval '1 hour'`);
  if (Number(emailCount.n) >= 3) throw new RateLimitError();
  if (fields.ip) {
    const [ipCount] = await db.select({ n: sql<number>`count(*)::int` }).from(loginTokens)
      .where(sql`${loginTokens.ip} = ${fields.ip} and ${loginTokens.createdAt} > now() - interval '1 hour'`);
    if (Number(ipCount.n) >= 10) throw new RateLimitError();
  }
  const token = newToken();
  await db.insert(loginTokens).values({
    tokenHash: hashToken(token), purpose: fields.purpose, emailLower: fields.emailLower,
    username: fields.username ?? null, userId: fields.userId ?? null, ip: fields.ip ?? null,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return token;
}

export async function requestSignup(usernameRaw: string, emailRaw: string, ip: string | null): Promise<Sent | Err> {
  const vu = validateUsername(usernameRaw);
  if (!vu.ok) return { status: "error", error: vu.error };
  const ve = validateEmail(emailRaw);
  if (!ve.ok) return { status: "error", error: ve.error };

  const existingEmail = await db.select({ id: users.id }).from(users).where(eq(users.emailLower, ve.emailLower));
  if (existingEmail.length > 0) {
    // Already a member — send a sign-in link instead; the page copy stays identical.
    try {
      const token = await issueToken({ purpose: "login", emailLower: ve.emailLower, userId: existingEmail[0].id, ip });
      return { status: "sent", kind: "login", token, emailLower: ve.emailLower };
    } catch (e) {
      if (e instanceof RateLimitError) return { status: "error", error: RATE_LIMIT_MSG };
      throw e;
    }
  }
  const existingName = await db.select({ id: users.id }).from(users)
    .where(eq(users.usernameLower, vu.username.toLowerCase()));
  if (existingName.length > 0) return { status: "error", error: "That username is taken." };

  try {
    const token = await issueToken({ purpose: "signup", emailLower: ve.emailLower, username: vu.username, ip });
    return { status: "sent", kind: "signup", token, emailLower: ve.emailLower };
  } catch (e) {
    if (e instanceof RateLimitError) return { status: "error", error: RATE_LIMIT_MSG };
    throw e;
  }
}

export async function requestLogin(emailRaw: string, ip: string | null):
  Promise<{ status: "sent"; token: string; emailLower: string } | { status: "silent" } | Err> {
  const ve = validateEmail(emailRaw);
  if (!ve.ok) return { status: "error", error: ve.error };
  const found = await db.select({ id: users.id }).from(users).where(eq(users.emailLower, ve.emailLower));
  if (found.length === 0) return { status: "silent" };
  try {
    const token = await issueToken({ purpose: "login", emailLower: ve.emailLower, userId: found[0].id, ip });
    return { status: "sent", token, emailLower: ve.emailLower };
  } catch (e) {
    // A rate-limited real email must look identical to an unknown email (no token issued
    // either way), or the distinct "error" state becomes an account-enumeration oracle.
    if (e instanceof RateLimitError) return { status: "silent" };
    throw e;
  }
}

export async function requestEmailChange(userId: number, emailRaw: string, ip: string | null = null):
  Promise<{ status: "sent"; token: string; emailLower: string } | Err> {
  const ve = validateEmail(emailRaw);
  if (!ve.ok) return { status: "error", error: ve.error };
  const clash = await db.select({ id: users.id }).from(users).where(eq(users.emailLower, ve.emailLower));
  if (clash.length > 0 && clash[0].id !== userId) {
    return { status: "error", error: "That email is already attached to an account." };
  }
  try {
    const token = await issueToken({ purpose: "email-change", emailLower: ve.emailLower, userId, ip });
    return { status: "sent", token, emailLower: ve.emailLower };
  } catch (e) {
    if (e instanceof RateLimitError) return { status: "error", error: RATE_LIMIT_MSG };
    throw e;
  }
}

async function createSession(userId: number): Promise<string> {
  const token = newToken();
  await db.insert(sessions).values({
    tokenHash: hashToken(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  return token;
}

export async function verifyToken(rawToken: string, usernameOverride?: string): Promise<
  | { status: "ok"; sessionToken: string; username: string }
  | { status: "invalid" | "expired" | "used" }
  | { status: "username-taken" }
> {
  const [t] = await db.select().from(loginTokens).where(eq(loginTokens.tokenHash, hashToken(rawToken)));
  if (!t) return { status: "invalid" };
  if (t.usedAt) return { status: "used" };
  if (t.expiresAt.getTime() < Date.now()) return { status: "expired" };

  let userId: number, username: string;
  if (t.purpose === "signup") {
    const wanted = usernameOverride ?? t.username ?? "";
    const vu = validateUsername(wanted);
    if (!vu.ok) return { status: "username-taken" }; // bad override → re-pick again
    const clash = await db.select({ id: users.id }).from(users)
      .where(eq(users.usernameLower, vu.username.toLowerCase()));
    if (clash.length > 0) return { status: "username-taken" }; // token NOT consumed

    let u: { id: number; username: string };
    try {
      [u] = await db.insert(users).values({
        username: vu.username, usernameLower: vu.username.toLowerCase(), emailLower: t.emailLower,
      }).returning({ id: users.id, username: users.username });
    } catch (e) {
      if (isUniqueViolation(e)) return { status: "username-taken" }; // lost a signup race
      throw e;
    }
    userId = u.id; username = u.username;
  } else {
    if (!t.userId) return { status: "invalid" };
    if (t.purpose === "email-change") {
      try {
        await db.update(users).set({ emailLower: t.emailLower }).where(eq(users.id, t.userId));
      } catch (e) {
        if (isUniqueViolation(e)) return { status: "invalid" }; // email got taken between issue and confirm
        throw e;
      }
    }
    const [u] = await db.select({ id: users.id, username: users.username }).from(users).where(eq(users.id, t.userId));
    if (!u) return { status: "invalid" };
    userId = u.id; username = u.username;
  }
  await db.update(loginTokens).set({ usedAt: new Date() }).where(eq(loginTokens.tokenHash, t.tokenHash));
  return { status: "ok", sessionToken: await createSession(userId), username };
}

export async function getSessionUser(rawToken: string): Promise<SessionUser | null> {
  const tokenHash = hashToken(rawToken);
  const [row] = await db.select({
    tokenHash: sessions.tokenHash, expiresAt: sessions.expiresAt,
    id: users.id, username: users.username, role: users.role, signature: users.signature,
    postCount: users.postCount, joinedAt: users.joinedAt, markAllReadAt: users.markAllReadAt,
    bannedAt: users.bannedAt, bannedReason: users.bannedReason, lastSeenAt: users.lastSeenAt,
  }).from(sessions).innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.tokenHash, tokenHash));
  if (!row) return null;
  const now = Date.now();
  if (row.expiresAt.getTime() < now) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }
  if (row.expiresAt.getTime() - now < SESSION_TTL_MS - SLIDE_AFTER_MS) {
    await db.update(sessions).set({ expiresAt: new Date(now + SESSION_TTL_MS), lastUsedAt: new Date() })
      .where(eq(sessions.tokenHash, tokenHash));
  }
  if (!row.lastSeenAt || now - row.lastSeenAt.getTime() > 5 * 60_000) {
    await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, row.id));
  }
  return {
    id: row.id, username: row.username, role: row.role as "member" | "admin",
    signature: row.signature, postCount: row.postCount, joinedAt: row.joinedAt,
    markAllReadAt: row.markAllReadAt, bannedAt: row.bannedAt, bannedReason: row.bannedReason,
  };
}

export async function deleteSession(rawToken: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(rawToken)));
}

export async function updateSignature(userId: number, raw: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const signature = raw.trim();
  if (signature.length > SIGNATURE_MAX) return { ok: false, error: `Signatures max out at ${SIGNATURE_MAX} characters.` };
  await db.update(users).set({ signature: signature || null }).where(eq(users.id, userId));
  return { ok: true };
}

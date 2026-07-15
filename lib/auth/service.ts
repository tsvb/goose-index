import { db } from "@/db/client";
import { users, sessions, loginTokens } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { newToken, hashToken } from "./crypto";
import { validateUsername, validateEmail } from "./validate";

export const TOKEN_TTL_MS = 15 * 60_000;
export const SESSION_TTL_MS = 90 * 24 * 3_600_000;
export const SLIDE_AFTER_MS = 7 * 24 * 3_600_000;

export type SessionUser = {
  id: number; username: string; role: "member" | "admin"; signature: string | null;
  postCount: number; joinedAt: Date; markAllReadAt: Date | null;
  bannedAt: Date | null; bannedReason: string | null;
};

type Sent = { status: "sent"; kind: "signup" | "login"; token: string; emailLower: string };
type Err = { status: "error"; error: string };

async function issueToken(fields: {
  purpose: "signup" | "login" | "email-change"; emailLower: string;
  username?: string; userId?: number; ip?: string | null;
}): Promise<string> {
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
    const token = await issueToken({ purpose: "login", emailLower: ve.emailLower, userId: existingEmail[0].id, ip });
    return { status: "sent", kind: "login", token, emailLower: ve.emailLower };
  }
  const existingName = await db.select({ id: users.id }).from(users)
    .where(eq(users.usernameLower, vu.username.toLowerCase()));
  if (existingName.length > 0) return { status: "error", error: "That username is taken." };

  const token = await issueToken({ purpose: "signup", emailLower: ve.emailLower, username: vu.username, ip });
  return { status: "sent", kind: "signup", token, emailLower: ve.emailLower };
}

export async function requestLogin(emailRaw: string, ip: string | null):
  Promise<{ status: "sent"; token: string; emailLower: string } | { status: "silent" } | Err> {
  const ve = validateEmail(emailRaw);
  if (!ve.ok) return { status: "error", error: ve.error };
  const found = await db.select({ id: users.id }).from(users).where(eq(users.emailLower, ve.emailLower));
  if (found.length === 0) return { status: "silent" };
  const token = await issueToken({ purpose: "login", emailLower: ve.emailLower, userId: found[0].id, ip });
  return { status: "sent", token, emailLower: ve.emailLower };
}

export async function requestEmailChange(userId: number, emailRaw: string):
  Promise<{ status: "sent"; token: string; emailLower: string } | Err> {
  const ve = validateEmail(emailRaw);
  if (!ve.ok) return { status: "error", error: ve.error };
  const clash = await db.select({ id: users.id }).from(users).where(eq(users.emailLower, ve.emailLower));
  if (clash.length > 0 && clash[0].id !== userId) {
    return { status: "error", error: "That email is already attached to an account." };
  }
  const token = await issueToken({ purpose: "email-change", emailLower: ve.emailLower, userId });
  return { status: "sent", token, emailLower: ve.emailLower };
}

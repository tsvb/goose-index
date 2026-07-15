import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, SESSION_TTL_MS, type SessionUser } from "./service";

export const SESSION_COOKIE = "ga_session";

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? getSessionUser(token) : null;
}

export async function requireUser(next = "/forum"): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) redirect(`/forum/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function setSessionCookie(token: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", path: "/", maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function clientIp(): Promise<string | null> {
  const fwd = (await headers()).get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : null;
}

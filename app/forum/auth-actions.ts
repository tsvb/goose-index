"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requestSignup, requestLogin, verifyToken, deleteSession } from "@/lib/auth/service";
import { sendMagicLink, authOrigin } from "@/lib/auth/email";
import { setSessionCookie, clearSessionCookie, clientIp, SESSION_COOKIE } from "@/lib/auth/session.server";

export type AuthFormState = { error?: string; sent?: boolean; usernameTaken?: boolean };

const str = (fd: FormData, k: string): string => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

const verifyUrl = (token: string) => `${authOrigin()}/forum/verify?token=${token}`;

export async function joinAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const r = await requestSignup(str(fd, "username"), str(fd, "email"), await clientIp());
  if (r.status === "error") return { error: r.error };
  await sendMagicLink({ to: r.emailLower, url: verifyUrl(r.token), kind: r.kind });
  return { sent: true };
}

export async function loginAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const r = await requestLogin(str(fd, "email"), await clientIp());
  if (r.status === "error") return { error: r.error };
  if (r.status === "sent") await sendMagicLink({ to: r.emailLower, url: verifyUrl(r.token), kind: "login" });
  return { sent: true }; // "silent" renders identically — no account enumeration
}

export async function verifyAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const v = await verifyToken(str(fd, "token"), str(fd, "username") || undefined);
  if (v.status === "ok") {
    await setSessionCookie(v.sessionToken);
    redirect("/forum");
  }
  if (v.status === "username-taken") return { usernameTaken: true };
  return {
    error: v.status === "expired"
      ? "That link has expired — request a new one."
      : "That link is invalid or was already used.",
  };
}

export async function logoutAction(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(token);
  await clearSessionCookie();
  redirect("/forum");
}

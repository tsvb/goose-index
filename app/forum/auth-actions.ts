"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { after } from "next/server";
import { requestSignup, requestLogin, verifyToken, deleteSession, requestEmailChange, updateSignature } from "@/lib/auth/service";
import { sendMagicLink, authOrigin } from "@/lib/auth/email";
import { setSessionCookie, clearSessionCookie, clientIp, SESSION_COOKIE, requireUser } from "@/lib/auth/session.server";

export type AuthFormState = { error?: string; sent?: boolean; usernameTaken?: boolean };

const str = (fd: FormData, k: string): string => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

const verifyUrl = (token: string) => `${authOrigin()}/forum/verify?token=${token}`;

export async function joinAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const r = await requestSignup(str(fd, "username"), str(fd, "email"), await clientIp());
  if (r.status === "error") return { error: r.error };
  // after(): the send happens post-response — no latency difference between account/no-account paths
  after(() => sendMagicLink({ to: r.emailLower, url: verifyUrl(r.token), kind: r.kind }));
  return { sent: true };
}

export async function loginAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const r = await requestLogin(str(fd, "email"), await clientIp());
  if (r.status === "error") return { error: r.error };
  if (r.status === "sent") {
    const { token, emailLower } = r;
    after(() => sendMagicLink({ to: emailLower, url: verifyUrl(token), kind: "login" }));
  }
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

export async function settingsAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const user = await requireUser("/forum/settings");
  const r = await updateSignature(user.id, str(fd, "signature"));
  if (!r.ok) return { error: r.error };
  return { sent: true }; // rendered as "Saved."
}

export async function emailChangeAction(_prev: AuthFormState, fd: FormData): Promise<AuthFormState> {
  const user = await requireUser("/forum/settings");
  const r = await requestEmailChange(user.id, str(fd, "email"));
  if (r.status === "error") return { error: r.error };
  after(() => sendMagicLink({ to: r.emailLower, url: verifyUrl(r.token), kind: "email-change" }));
  return { sent: true };
}

import { SITE_URL } from "@/lib/site";

export function authOrigin(): string {
  return process.env.VERCEL ? SITE_URL : "http://localhost:3000";
}

const SUBJECTS = {
  signup: "Finish joining the Goose Index forum",
  login: "Your Goose Index sign-in link",
  "email-change": "Confirm your new email for Goose Index",
} as const;

export type MagicLinkMessage = { to: string; url: string; kind: keyof typeof SUBJECTS };

/** Sends via the Resend HTTP API; with no RESEND_API_KEY (local dev) prints the link. */
export async function sendMagicLink(msg: MagicLinkMessage, fetchImpl: typeof fetch = fetch): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`[auth] magic link for ${msg.to} (${msg.kind}): ${msg.url}`);
    return;
  }
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.AUTH_EMAIL_FROM ?? "Goose Index <forum@gooseindex.com>",
      to: [msg.to],
      subject: SUBJECTS[msg.kind],
      text: `Click to continue:\n\n${msg.url}\n\nThis link works once and expires in 15 minutes. If you didn't request it, ignore this email.`,
    }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
}

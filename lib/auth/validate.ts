const USERNAME_RE = /^[A-Za-z0-9_-]{3,20}$/;
// Shape check only — the magic link is the real verification.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateUsername(raw: string): { ok: true; username: string } | { ok: false; error: string } {
  const username = raw.trim();
  if (!USERNAME_RE.test(username)) {
    return { ok: false, error: "Usernames are 3–20 characters: letters, numbers, - and _." };
  }
  return { ok: true, username };
}

export function validateEmail(raw: string): { ok: true; emailLower: string } | { ok: false; error: string } {
  const emailLower = raw.trim().toLowerCase();
  if (emailLower.length > 254 || !EMAIL_RE.test(emailLower)) {
    return { ok: false, error: "That doesn't look like an email address." };
  }
  return { ok: true, emailLower };
}

import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import type { SessionUser } from "@/lib/auth/service";

type Gate = { ok: true } | { ok: false; error: string };
const NEW_ACCOUNT_MS = 24 * 3_600_000;
const isNew = (u: SessionUser) => Date.now() - u.joinedAt.getTime() < NEW_ACCOUNT_MS;
const one = async (q: ReturnType<typeof sql>) => {
  const res = await db.execute(q);
  const rows = Array.isArray(res) ? res : ((res as { rows?: unknown[] }).rows ?? []);
  return (rows as Record<string, unknown>[])[0] ?? {};
};

/** Spec table: ≥30s between posts (60s for <24h accounts); new accounts ≤30 posts/day, ≤2 links/post. */
export async function postGate(user: SessionUser, body: string): Promise<Gate> {
  const fresh = isNew(user);
  const minGapS = fresh ? 60 : 30;
  const recent = await one(sql`
    select count(*)::int as n from forum_posts
    where author_id = ${user.id} and created_at > now() - interval '1 second' * ${minGapS}
  `);
  if (Number(recent.n) > 0) return { ok: false, error: `Slow down — one post every ${minGapS} seconds.` };
  if (fresh) {
    const day = await one(sql`
      select count(*)::int as n from forum_posts
      where author_id = ${user.id} and created_at > now() - interval '1 day'
    `);
    if (Number(day.n) >= 30) return { ok: false, error: "New accounts are limited to 30 posts a day." };
    const links = (body.match(/https?:\/\//gi) ?? []).length;
    if (links > 2) return { ok: false, error: "New accounts are limited to 2 links per post." };
  }
  return { ok: true };
}

/** ≤3 new threads/day for <24h accounts, ≤10/day for everyone else. */
export async function threadGate(user: SessionUser): Promise<Gate> {
  const cap = isNew(user) ? 3 : 10;
  const day = await one(sql`
    select count(*)::int as n from forum_threads
    where author_id = ${user.id} and created_at > now() - interval '1 day'
  `);
  if (Number(day.n) >= cap) return { ok: false, error: `That's the daily thread limit (${cap}) — back tomorrow.` };
  return { ok: true };
}

import { randomBytes, createHash } from "node:crypto";

/** 32 random bytes, base64url — the raw secret that goes in links/cookies. */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** sha256 hex — the only form ever stored in the database. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

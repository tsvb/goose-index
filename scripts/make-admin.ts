import "dotenv/config";
import { db, closeDb } from "../db/client";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) { console.error("usage: npm run make-admin -- you@example.com"); process.exit(1); }
const res = await db.update(users).set({ role: "admin" }).where(eq(users.emailLower, email))
  .returning({ username: users.username });
if (res.length === 0) { console.error(`no user with email ${email}`); process.exit(1); }
console.log(`${res[0].username} is now an admin`);
await closeDb();

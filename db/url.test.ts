import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { databaseUrl } from "./url";

// Five preview builds failed in a row on 2026-08-29 with "DATABASE_URL is not
// set". The Vercel ↔ Supabase integration writes POSTGRES_URL to Production
// only, and the one DATABASE_URL that existed was pinned to a since-merged
// branch — so a preview built from main saw neither name. The precedence below
// is a documented contract (docs/DEPLOY.md) that two entry points lean on:
// scripts/migrate.ts and db/client.ts both throw the moment it returns
// undefined, and a deploy is where that gets discovered.

const NAMES = ["DATABASE_URL", "POSTGRES_URL"] as const;
const original = new Map(NAMES.map((n) => [n, process.env[n]]));

// db/url.ts imports no dotenv, so .env is not in play here — but clear both
// names anyway, so an ambient value can never be what decides a result.
beforeEach(() => NAMES.forEach((n) => delete process.env[n]));

afterAll(() => {
  for (const [name, value] of original) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

describe("databaseUrl", () => {
  it("prefers DATABASE_URL when both are set", () => {
    process.env.DATABASE_URL = "postgres://u:p@hand-set.example:5432/db";
    process.env.POSTGRES_URL = "postgres://u:p@aws-1-us-east-1.pooler.supabase.com:6543/postgres";
    expect(databaseUrl()).toBe("postgres://u:p@hand-set.example:5432/db");
  });

  it("falls back to POSTGRES_URL — the case that broke every preview build", () => {
    const injected = "postgres://u:p@aws-1-us-east-1.pooler.supabase.com:6543/postgres";
    process.env.POSTGRES_URL = injected;
    expect(databaseUrl()).toBe(injected);
  });

  it("returns undefined when neither is set, leaving the complaint to the caller", () => {
    expect(databaseUrl()).toBeUndefined();
  });

  it("reads the environment when called, not when imported", () => {
    // db/client.ts exports `db` eagerly but connects on first use, because
    // `next build` pulls it into the module graph of every route. That lazy
    // connect is only lazy if the resolver looks at process.env this late.
    expect(databaseUrl()).toBeUndefined();
    process.env.POSTGRES_URL = "postgres://u:p@late.example:5432/db";
    expect(databaseUrl()).toBe("postgres://u:p@late.example:5432/db");
  });

  // A Vercel variable can hold an empty string, and `??` only falls back on
  // null/undefined — so an empty DATABASE_URL used to shadow a perfectly good
  // POSTGRES_URL and fail the build with "DATABASE_URL is not set", pointing
  // at the one name that was actually present.
  it("treats an empty DATABASE_URL as unset and falls back", () => {
    const injected = "postgres://u:p@aws-1-us-east-1.pooler.supabase.com:6543/postgres";
    process.env.DATABASE_URL = "";
    process.env.POSTGRES_URL = injected;
    expect(databaseUrl()).toBe(injected);
  });

  it("returns undefined when both are empty, so the caller's complaint is true", () => {
    process.env.DATABASE_URL = "";
    process.env.POSTGRES_URL = "";
    expect(databaseUrl()).toBeUndefined();
  });
});

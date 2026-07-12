import { describe, it, expect } from "vitest";
import { shouldSkipMigrations } from "./migrate-gate";

// This gate is the only thing standing between an unmerged branch and the
// production schema: Vercel scopes DATABASE_URL to Preview *and* Production,
// and both point at the same Neon database. Inverting it would let any pushed
// branch migrate prod. Pin the polarity of every case.
describe("shouldSkipMigrations", () => {
  it("runs migrations for a production Vercel build", () => {
    expect(shouldSkipMigrations({ VERCEL: "1", VERCEL_ENV: "production" })).toBe(false);
  });

  it("skips a preview build, which shares the production database", () => {
    expect(shouldSkipMigrations({ VERCEL: "1", VERCEL_ENV: "preview" })).toBe(true);
  });

  it("skips a development Vercel build", () => {
    expect(shouldSkipMigrations({ VERCEL: "1", VERCEL_ENV: "development" })).toBe(true);
  });

  // Fail closed: on Vercel with an env we can't identify, don't touch the schema.
  it("skips on Vercel when VERCEL_ENV is absent or unrecognised", () => {
    expect(shouldSkipMigrations({ VERCEL: "1" })).toBe(true);
    expect(shouldSkipMigrations({ VERCEL: "1", VERCEL_ENV: "" })).toBe(true);
    expect(shouldSkipMigrations({ VERCEL: "1", VERCEL_ENV: "staging" })).toBe(true);
  });

  // Off Vercel the gate must be inert, or it would break `npm run db:migrate`
  // locally and the nightly sync Action, which are the supported ways to
  // migrate by hand.
  it("is inert off Vercel, even if VERCEL_ENV leaks into the environment", () => {
    expect(shouldSkipMigrations({})).toBe(false);
    expect(shouldSkipMigrations({ VERCEL_ENV: "preview" })).toBe(false);
    expect(shouldSkipMigrations({ VERCEL: "", VERCEL_ENV: "preview" })).toBe(false);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import {
  CATALOG_TAG,
  cacheEnabled,
  cachedQuery,
  revalidateCatalog,
  revalidateLiveShow,
  showDateTag,
  showIdTag,
} from "./cache";

describe("query cache helpers", () => {
  afterEach(() => {
    delete process.env.NEXT_RUNTIME;
    delete process.env.VERCEL;
  });

  it("is off outside the Next.js runtime, so tests and scripts hit the database", () => {
    expect(cacheEnabled()).toBe(false);
  });

  it("is on when Next sets NEXT_RUNTIME", () => {
    process.env.NEXT_RUNTIME = "nodejs";
    expect(cacheEnabled()).toBe(true);
  });

  it("is on when Vercel sets VERCEL, even without NEXT_RUNTIME", () => {
    process.env.VERCEL = "1";
    expect(cacheEnabled()).toBe(true);
  });

  it("names show tags from the date and the elgoose id", () => {
    expect(showDateTag("2026-08-26")).toBe("show:2026-08-26");
    expect(showIdTag(900)).toBe("show-id:900");
    expect(CATALOG_TAG).toBe("catalog");
  });

  it("runs the query on every call when the cache is off", async () => {
    let n = 0;
    expect(await cachedQuery("t", [], async () => ++n)).toBe(1);
    expect(await cachedQuery("t", [1], async () => ++n)).toBe(2);
  });

  it("falls back to the query when Next's cache isn't actually available", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    let n = 0;
    expect(await cachedQuery("t", [], async () => ++n)).toBe(1);
    expect(await cachedQuery("t", [], async () => ++n)).toBe(2);
  });

  // Outside Next there is no cache to drop, and the honest answer to "did you
  // drop it?" is no. /api/revalidate reports this straight through rather than
  // telling the nightly Action a cache moved when none exists.
  it("revalidate helpers report failure outside Next rather than claiming success", async () => {
    await expect(revalidateLiveShow("2026-08-26", [1])).resolves.toBe(false);
    await expect(revalidateCatalog()).resolves.toBe(false);
  });
});

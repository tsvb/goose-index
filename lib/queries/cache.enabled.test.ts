import { afterEach, describe, expect, it, vi } from "vitest";

const unstableCalls: { keys: string[]; opts: { tags?: string[]; revalidate?: number } }[] = [];
const tags: string[] = [];

vi.mock("next/cache", () => ({
  unstable_cache: (
    fn: () => Promise<unknown>,
    keys: string[],
    opts: { tags?: string[]; revalidate?: number },
  ) => {
    unstableCalls.push({ keys, opts });
    return async () => fn();
  },
  revalidateTag: (tag: string) => {
    tags.push(tag);
  },
}));

import {
  CATALOG_REVALIDATE_SECONDS,
  CATALOG_TAG,
  cachedQuery,
  revalidateCatalog,
  revalidateLiveShow,
} from "./cache";

describe("cachedQuery when Next's cache is available", () => {
  afterEach(() => {
    delete process.env.NEXT_RUNTIME;
    delete process.env.VERCEL;
    unstableCalls.length = 0;
    tags.length = 0;
  });

  it("wraps the query in unstable_cache with the catalog tag and TTL", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    const result = await cachedQuery("getShowDetails", ["2026-08-26"], async () => ({ ok: true }));
    expect(result).toEqual({ ok: true });
    expect(unstableCalls).toHaveLength(1);
    expect(unstableCalls[0].keys[0]).toBe("getShowDetails");
    expect(unstableCalls[0].keys).toContain(JSON.stringify("2026-08-26"));
    expect(unstableCalls[0].opts.tags).toEqual([CATALOG_TAG]);
    expect(unstableCalls[0].opts.revalidate).toBe(CATALOG_REVALIDATE_SECONDS);
  });

  it("is enabled on Vercel even without NEXT_RUNTIME", async () => {
    process.env.VERCEL = "1";
    await cachedQuery("t", [], async () => 1);
    expect(unstableCalls).toHaveLength(1);
  });

  it("revalidateLiveShow busts the date and show-id tags", async () => {
    process.env.NEXT_RUNTIME = "nodejs";
    await revalidateLiveShow("2026-08-26", [900, 901]);
    expect(tags).toEqual(["show:2026-08-26", "show-id:900", "show-id:901"]);
  });

  it("revalidateCatalog busts the catalog tag", async () => {
    process.env.VERCEL = "1";
    await revalidateCatalog();
    expect(tags).toEqual([CATALOG_TAG]);
  });
});

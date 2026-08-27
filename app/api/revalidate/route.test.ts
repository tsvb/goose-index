import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The route's whole job is to drop a cache tag, so the tests have to be able to
// see the tag drop. Without this mock `cacheEnabled()` is false under vitest and
// `revalidateCatalog()` returns early — a test asserting only the 200 would pass
// with the route and the cache wired to nothing at all.
const tags: string[] = [];
let revalidateThrows = false;

vi.mock("next/cache", () => ({
  revalidateTag: (tag: string) => {
    if (revalidateThrows) throw new Error("static generation store missing");
    tags.push(tag);
  },
}));

import { POST } from "./route";

const post = (headers?: Record<string, string>) =>
  POST(new Request("http://localhost/api/revalidate", { method: "POST", headers }));

beforeEach(() => {
  tags.length = 0;
  revalidateThrows = false;
  delete process.env.NEXT_RUNTIME;
  delete process.env.VERCEL;
});

afterEach(() => {
  delete process.env.REVALIDATE_SECRET;
  delete process.env.NEXT_RUNTIME;
  delete process.env.VERCEL;
});

describe("POST /api/revalidate", () => {
  it("returns 501 when the secret is not configured", async () => {
    const res = await post();
    expect(res.status).toBe(501);
    expect(tags).toEqual([]);
  });

  it("rejects a missing or wrong bearer token", async () => {
    process.env.REVALIDATE_SECRET = "s3cret";
    expect((await post()).status).toBe(401);
    expect((await post({ authorization: "Bearer nope" })).status).toBe(401);
    // A prefix of the real secret must not fare any better than a wrong one.
    expect((await post({ authorization: "Bearer s3cre" })).status).toBe(401);
    expect((await post({ authorization: "s3cret" })).status).toBe(401);
    expect(tags).toEqual([]);
  });

  it("drops the catalog tag when the bearer matches", async () => {
    process.env.REVALIDATE_SECRET = "s3cret";
    process.env.NEXT_RUNTIME = "nodejs";
    const res = await post({ authorization: "Bearer s3cret" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: true });
    expect(tags).toEqual(["catalog"]);
  });

  // The nightly Action reads this. A 200 for a cache that never moved is a
  // green run reporting work that did not happen.
  it("reports a failed revalidation rather than claiming success", async () => {
    process.env.REVALIDATE_SECRET = "s3cret";
    process.env.NEXT_RUNTIME = "nodejs";
    revalidateThrows = true;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const res = await post({ authorization: "Bearer s3cret" });
    expect(res.status).toBe(500);
    expect((await res.json()).revalidated).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("reports failure when the cache isn't available at all", async () => {
    process.env.REVALIDATE_SECRET = "s3cret";
    // No NEXT_RUNTIME and no VERCEL: nothing to bust, so don't claim otherwise.
    const res = await post({ authorization: "Bearer s3cret" });
    expect(res.status).toBe(500);
    expect((await res.json()).revalidated).toBe(false);
    expect(tags).toEqual([]);
  });
});

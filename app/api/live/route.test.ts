import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LiveStatus } from "@/lib/sync/maybe-live";

let next: LiveStatus = { live: false };
vi.mock("@/lib/sync/maybe-live", () => ({ maybeLiveSync: async () => next }));

import { GET } from "./route";

describe("GET /api/live", () => {
  beforeEach(() => {
    next = { live: false };
  });

  it("lets Vercel's CDN share one answer across tabs for 30s, under the 60s sync debounce", async () => {
    next = { live: true, date: "2026-11-20", claimed: false };
    const res = await GET();
    expect(res.headers.get("vercel-cdn-cache-control")).toBe("max-age=30");
    // Browsers never keep it: the shared CDN is the only cache.
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual(next);
  });

  it("never holds a failed sync at the CDN, and hides the driver's message", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    next = { live: true, date: "2026-11-20", error: "connect ECONNREFUSED db.internal:5432" };
    const res = await GET();
    expect(res.headers.get("vercel-cdn-cache-control")).toBeNull();
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect((await res.json()).error).toBe("live sync failed");
  });
});

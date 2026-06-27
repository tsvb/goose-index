import { describe, it, expect, vi } from "vitest";
import { createElgooseClient } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("createElgooseClient.fetchMethod", () => {
  it("returns data[] and sends a User-Agent + correct URL", async () => {
    const mockFetch = vi.fn(async (_url: string, _init?: RequestInit) => jsonResponse({ error: false, error_message: "", data: [{ id: 1 }] }));
    const fetchImpl = mockFetch as unknown as typeof fetch;
    const client = createElgooseClient({ baseUrl: "https://x/api/v2", userAgent: "UA/1", fetchImpl });
    const data = await client.fetchMethod<{ id: number }>("songs", { limit: 5 });
    expect(data).toEqual([{ id: 1 }]);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://x/api/v2/songs.json?limit=5");
    expect(init?.headers).toMatchObject({ "User-Agent": "UA/1" });
  });

  it("throws when the envelope reports error: true", async () => {
    const mockFetch = vi.fn(async () => jsonResponse({ error: true, error_message: "boom", data: [] }));
    const fetchImpl = mockFetch as unknown as typeof fetch;
    const client = createElgooseClient({ fetchImpl, maxRetries: 0 });
    await expect(client.fetchMethod("songs")).rejects.toThrow(/boom/);
  });

  it("retries on a 503 then succeeds", async () => {
    const mockFetch = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, 503))
      .mockResolvedValueOnce(jsonResponse({ error: false, error_message: "", data: [{ ok: 1 }] }));
    const fetchImpl = mockFetch as unknown as typeof fetch;
    const client = createElgooseClient({ fetchImpl, maxRetries: 2, retryDelayMs: 0 });
    const data = await client.fetchMethod<{ ok: number }>("shows");
    expect(data).toEqual([{ ok: 1 }]);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("throws after exhausting retries on persistent 500", async () => {
    const mockFetch = vi.fn(async () => jsonResponse({}, 500));
    const fetchImpl = mockFetch as unknown as typeof fetch;
    const client = createElgooseClient({ fetchImpl, maxRetries: 1, retryDelayMs: 0 });
    await expect(client.fetchMethod("shows")).rejects.toThrow(/HTTP 500/);
    expect(mockFetch).toHaveBeenCalledTimes(2); // initial + 1 retry
  });
});

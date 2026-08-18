import { describe, it, expect } from "vitest";
import { createNugsCatalogClient } from "./client";

/** A fake fetch that serves pages from a map of offset -> containers, per list.
 *  `videoReleaseType=6` in the query selects the video list. */
function fakeFetch(audio: unknown[][], video: unknown[][]) {
  const calls: string[] = [];
  const impl = async (url: string | URL) => {
    const u = String(url);
    calls.push(u);
    const isVideo = u.includes("videoReleaseType=6");
    const offset = Number(new URL(u).searchParams.get("startOffset"));
    const pages = isVideo ? video : audio;
    const page = pages[Math.floor((offset - 1) / 2)] ?? [];
    return { ok: true, status: 200, json: async () => ({ Response: { containers: page } }) } as Response;
  };
  return { impl: impl as unknown as typeof fetch, calls };
}

const row = (id: number, date: string) => ({ containerID: id, performanceDateFormatted: date });

describe("createNugsCatalogClient", () => {
  it("pages until a short page and merges both lists", async () => {
    const { impl, calls } = fakeFetch(
      [[row(1, "2026/01/01"), row(2, "2026/01/02")], [row(3, "2026/01/03")]],
      [[row(2, "2026/01/02")]],
    );
    const client = createNugsCatalogClient({ fetchImpl: impl, pageSize: 2 });
    const rows = await client.fetchAllContainers();

    expect(rows.map((r) => r.containerId).sort()).toEqual([1, 2, 3]);
    // The video list marks container 2, and only container 2.
    expect(rows.find((r) => r.containerId === 2)!.hasVideo).toBe(true);
    expect(rows.find((r) => r.containerId === 1)!.hasVideo).toBe(false);
    // Two audio requests (full page then short page) + one video request.
    expect(calls).toHaveLength(3);
  });

  it("stops at the first empty page", async () => {
    const { impl, calls } = fakeFetch([[]], [[]]);
    const client = createNugsCatalogClient({ fetchImpl: impl, pageSize: 2 });
    expect(await client.fetchAllContainers()).toEqual([]);
    expect(calls).toHaveLength(2);
  });

  it("throws on a non-ok response rather than returning a partial catalog", async () => {
    const impl = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    const client = createNugsCatalogClient({ fetchImpl: impl });
    await expect(client.fetchAllContainers()).rejects.toThrow(/503/);
  });
});

import { describe, it, expect } from "vitest";
import { createNugsCatalogClient } from "./client";

/** A fake fetch that serves pages from a map of offset -> containers, per list.
 *  `videoReleaseType=6` in the query selects the video list. `pageSize` must match
 *  the client's own `pageSize` option so the offset -> page-index math lines up. */
function fakeFetch(audio: unknown[][], video: unknown[][], pageSize = 2) {
  const calls: string[] = [];
  const impl = async (url: string | URL) => {
    const u = String(url);
    calls.push(u);
    const isVideo = u.includes("videoReleaseType=6");
    const offset = Number(new URL(u).searchParams.get("startOffset"));
    const pages = isVideo ? video : audio;
    const page = pages[Math.floor((offset - 1) / pageSize)] ?? [];
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

  it("names the failing list in the error message", async () => {
    const impl = (async () => ({ ok: false, status: 503, json: async () => ({}) })) as unknown as typeof fetch;
    const client = createNugsCatalogClient({ fetchImpl: impl });
    // fetchAllContainers hits the audio list first, so that's the one that fails here.
    await expect(client.fetchAllContainers()).rejects.toThrow(/nugs catalog \(audio\) HTTP 503/);
  });

  // Regression: parseContainers legitimately drops rows (an empty
  // performanceDateFormatted is real data, not a bug), so an interior page can
  // come back RAW-full but PARSED-short. Terminating on the parsed count would
  // stop paging right there and silently drop every page after it.
  it("does not truncate the catalog when an interior page parses short due to an unparseable row", async () => {
    const audioPages = [
      [row(1, "2026/01/01"), row(2, "2026/01/02")],
      // Raw length 2 == pageSize, but one row is unparseable (no usable date) so
      // this page parses to length 1 — the exact short-parse-but-not-short-raw case.
      [{ containerID: 9, performanceDateFormatted: "" }, row(3, "2026/01/03")],
      [row(4, "2026/01/04"), row(5, "2026/01/05")],
      [],
    ];
    const { impl } = fakeFetch(audioPages, [[]], 2);
    const client = createNugsCatalogClient({ fetchImpl: impl, pageSize: 2 });
    const rows = await client.fetchAllContainers();

    const ids = rows.map((r) => r.containerId).sort((a, b) => a - b);
    // 4 and 5 only exist on the page after the short-parse page — their presence
    // is what proves paging kept going instead of stopping early.
    expect(ids).toEqual([1, 2, 3, 4, 5]);
  });

  // If nugs ever ignored startOffset, every page would look identical and the
  // loop would run to the CI timeout. A small pageSize keeps the fake fast
  // while still exercising the 100-page ceiling.
  it("throws when paging exceeds the page ceiling instead of looping forever", async () => {
    const fullPage = [row(1, "2026/01/01"), row(2, "2026/01/02")];
    const impl = (async () => ({
      ok: true, status: 200, json: async () => ({ Response: { containers: fullPage } }),
    })) as unknown as typeof fetch;
    const client = createNugsCatalogClient({ fetchImpl: impl, pageSize: 2 });
    await expect(client.fetchAllContainers()).rejects.toThrow(/paging exceeded 100 pages/);
  });

  // A future video-only container (one that never appears in the audio list)
  // must survive the merge rather than being dropped.
  it("keeps a container that appears only in the video list", async () => {
    const { impl } = fakeFetch(
      [[row(1, "2026/01/01")]],
      [[row(1, "2026/01/01"), row(7, "2026/01/07")]],
    );
    const client = createNugsCatalogClient({ fetchImpl: impl, pageSize: 2 });
    const rows = await client.fetchAllContainers();

    const videoOnly = rows.find((r) => r.containerId === 7);
    expect(videoOnly).toBeDefined();
    expect(videoOnly!.hasVideo).toBe(true);
  });
});

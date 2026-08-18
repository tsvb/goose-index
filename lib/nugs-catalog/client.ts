import { parseContainers, rawContainerCount, type NugsContainer } from "./parse";

/** nugs's legacy catalog host. Probed 2026-08-18: `catalog.containersAll` answers
 *  with no Authorization header at all. Goose is artistID 1205. */
const DEFAULT_BASE = "https://streamapi.nugs.net/api.aspx";
const DEFAULT_UA = "GooseIndex/1.0 (+https://github.com/tsvb/goose-index; nugs catalog import)";
const GOOSE_ARTIST_ID = 1205;
const DEFAULT_PAGE_SIZE = 100;   // limit > 100 returns HTTP 400
// 10,000 containers at the default page size — far above any real catalog
// (485 containers on 2026-08-18). Guards against an infinite loop if nugs
// ever ignores startOffset and keeps serving the same full page forever.
const MAX_PAGES = 100;

export interface NugsCatalogClientOptions {
  artistId?: number;
  baseUrl?: string;
  userAgent?: string;
  fetchImpl?: typeof fetch;
  pageSize?: number;
}

export type NugsCatalogClient = {
  fetchAllContainers(): Promise<NugsContainer[]>;
};

export function createNugsCatalogClient(opts: NugsCatalogClientOptions = {}): NugsCatalogClient {
  const artistId = opts.artistId ?? GOOSE_ARTIST_ID;
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE;
  const userAgent = opts.userAgent ?? DEFAULT_UA;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;

  function url(offset: number, videoOnly: boolean): string {
    const params: Record<string, string> = {
      method: "catalog.containersAll",
      artistList: String(artistId),
      startOffset: String(offset),
      limit: String(pageSize),
      availType: "1",
      vdisp: "1",
    };
    if (videoOnly) params.videoReleaseType = "6";
    const qs = Object.entries(params)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join("&");
    return `${baseUrl}?${qs}`;
  }

  /** Page one list until a short page. `startOffset` is 1-based. Termination is
   *  decided on the RAW row count from the payload, not the parsed row count:
   *  parseContainers legitimately drops rows (e.g. an empty performanceDateFormatted),
   *  so a full raw page can parse short, and breaking on that would silently
   *  truncate the catalog. */
  async function fetchList(videoOnly: boolean): Promise<NugsContainer[]> {
    const listName = videoOnly ? "video" : "audio";
    const all: NugsContainer[] = [];
    for (let offset = 1, page = 1; ; offset += pageSize, page += 1) {
      if (page > MAX_PAGES) {
        throw new Error(`nugs catalog paging exceeded ${MAX_PAGES} pages — startOffset may be ignored`);
      }
      const res = await fetchImpl(url(offset, videoOnly), { headers: { "User-Agent": userAgent } });
      if (!res.ok) throw new Error(`nugs catalog (${listName}) HTTP ${res.status} at offset ${offset}`);
      const body = await res.json();
      all.push(...parseContainers(body, { hasVideo: videoOnly }));
      if (rawContainerCount(body) < pageSize) break;
    }
    return all;
  }

  return {
    /** The full catalog. The video list is a filtered view of the same containers
     *  (probed 2026-08-18: every video ID is also an audio ID), so it is folded in
     *  as a flag rather than kept as separate rows. */
    async fetchAllContainers(): Promise<NugsContainer[]> {
      const audio = await fetchList(false);
      const video = await fetchList(true);
      const videoIds = new Set(video.map((c) => c.containerId));

      const byId = new Map<number, NugsContainer>();
      for (const c of audio) byId.set(c.containerId, { ...c, hasVideo: videoIds.has(c.containerId) });
      // A video container that never appeared in the audio list would be dropped
      // otherwise. None exist today; this keeps a future one from vanishing.
      for (const c of video) if (!byId.has(c.containerId)) byId.set(c.containerId, c);

      return [...byId.values()];
    },
  };
}

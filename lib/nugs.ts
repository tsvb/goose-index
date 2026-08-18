export const NUGS_SCHEME = "applenugs";
const ARTIST = "Goose";

export type NugsMedia = "audio" | "video";

/** Build a query string with `%20` encoding (NOT URLSearchParams, which emits `+`
 *  — Swift's URLComponents does not decode `+` to a space). Fixed key order;
 *  empty/nullish values are dropped. */
function query(pairs: Array<[string, string | number | null | undefined]>): string {
  return pairs
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`)
    .join("&");
}

export function nugsShowHref(o: { date: string; venue?: string | null; media?: NugsMedia }): string {
  const q = query([
    ["artist", ARTIST],
    ["venue", o.venue],
    ["media", o.media === "video" ? "video" : undefined],
  ]);
  return `${NUGS_SCHEME}://show/${o.date}?${q}`;
}

export function nugsTrackHref(o: {
  date: string; venue?: string | null; song: string;
  set?: string | null; pos?: number | null; media?: NugsMedia;
}): string {
  const q = query([
    ["artist", ARTIST],
    ["song", o.song],
    ["set", o.set],
    ["pos", o.pos],
    ["venue", o.venue],
    ["media", o.media === "video" ? "video" : undefined],
  ]);
  return `${NUGS_SCHEME}://show/${o.date}?${q}`;
}

/** The nugs web player's own routes, read from its router table on 2026-08-18:
 *  `{path:"/release", children:[{path:":id(\\d+)"}]}` and
 *  `{path:"/watch",   children:[{path:"release/:id(\\d+)"}]}`.
 *  Do NOT build these from the API's `pageURL` field — it 301s to /404/. */
export function nugsWebHref(o: { containerId: number; media?: NugsMedia }): string {
  const path = o.media === "video" ? "watch/release" : "release";
  return `https://play.nugs.net/${path}/${o.containerId}`;
}

/** Where a click goes when AppleNugs doesn't open. With a resolved containerID
 *  this is the show's exact page; without one it stays the old artist+date search,
 *  so an unmatched show degrades to the previous behaviour rather than a dead end.
 *  play.nugs.net requires a login — this lands the visitor at the show, it does
 *  not assert they can play it. */
export function nugsWebFallback(o: {
  date: string; venue?: string | null; containerId?: number | null; media?: NugsMedia;
}): string {
  if (o.containerId != null) return nugsWebHref({ containerId: o.containerId, media: o.media });
  return `https://play.nugs.net/#/search?searchTerm=${encodeURIComponent(`${ARTIST} ${o.date}`)}`;
}

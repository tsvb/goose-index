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

/** Web fallback for users without the app: deep-link `play.nugs.net`'s search
 *  to the artist + date so the show is one result away instead of a homepage.
 *  The SPA's hash router takes a `searchTerm` param; venue is deliberately left
 *  out of the term — artist + date is the tightest match nugs' search handles. */
export function nugsWebFallback(o: { date: string; venue?: string | null }): string {
  return `https://play.nugs.net/#/search?searchTerm=${encodeURIComponent(`${ARTIST} ${o.date}`)}`;
}

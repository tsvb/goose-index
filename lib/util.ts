export function toBool(v: unknown): boolean {
  return v === 1 || v === "1" || v === true;
}

/** Decode the HTML entities elgoose embeds in some text fields (e.g. "&amp;"). */
export function decodeEntities(s: string): string {
  if (!s || s.indexOf("&") === -1) return s;
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (m, n) => {
      try {
        return String.fromCodePoint(Number(n));
      } catch {
        return m;
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (m, n) => {
      try {
        return String.fromCodePoint(parseInt(n, 16));
      } catch {
        return m;
      }
    })
    .replace(/&amp;/g, "&");
}

export function emptyToNull(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  if (v.trim() === "") return null;
  // Preserve meaningful whitespace (e.g. the segue transition " > "); only decode entities.
  return decodeEntities(v);
}

/** Escape LIKE/ILIKE metacharacters so user text matches literally (Postgres default escape '\'). */
export function escapeLike(term: string): string {
  return term.replace(/[\\%_]/g, "\\$&");
}

/**
 * The canonical form of a search term — the one shape a query and its cache key
 * both read.
 *
 * Every search predicate on this site is `ilike` against a trimmed term, so
 * "Goose", "goose" and " goose " are already one question. They have to be one
 * cache key too: key on the raw string and they file three hour-long entries
 * holding one answer, each a fresh Postgres round-trip. `/search?q=` takes
 * unbounded public input, so that is a cache anyone can grow and a path that
 * misses every time.
 */
export function searchTerm(q: string): string {
  return q.trim().toLowerCase();
}

/**
 * A positive integer for paging, or `fallback` when the input isn't one.
 *
 * `?page=abc` arrives as NaN, and NaN is falsy — so drizzle drops the OFFSET
 * clause entirely (pg-core/dialect.js: `offset ? ... : void 0`) and the reader
 * silently gets page 1, while `JSON.stringify(NaN)` is `null`, which forks the
 * cache key. Same rows, its own hour-long entry. Flooring closes the same gap
 * for a fractional page.
 */
export function positiveInt(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

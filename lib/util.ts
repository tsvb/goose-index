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

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

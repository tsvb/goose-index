/** The band's Bandcamp. Where the music, and the money, actually goes. */
export const BANDCAMP_HOME = "https://goosetheband.bandcamp.com";

/**
 * Only ever link to Bandcamp.
 *
 * Every Bandcamp URL on this site comes from a scrape, which means it's data we
 * don't control. Without this, a compromised or poisoned scrape could plant an
 * arbitrary outbound link on a page fans trust — so the host is checked at
 * render time, not just at import.
 *
 * `endsWith(".bandcamp.com")` and not `includes`: "bandcamp.com.evil.test" must
 * not pass, and neither must a bare "bandcamp.com" host we didn't expect.
 */
export function isBandcampUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".bandcamp.com");
  } catch {
    return false;
  }
}

/** The URL to link, or null if it doesn't survive the guard. */
export function bandcampHref(url: string | null | undefined): string | null {
  return isBandcampUrl(url) ? url! : null;
}

/** Bandcamp's image sizes, by the format number in the file name. Bandcamp
 *  crops every cover square. */
const ART_SIZES = { thumb: 7, medium: 16, large: 10 } as const; // ~150, 700, 1200px
export type ArtSize = keyof typeof ART_SIZES;

/**
 * A release cover's URL, built from its art id, or null.
 *
 * The id comes from the same scrape as the URLs above, so it gets the same
 * distrust: only a run of digits becomes a URL, and the host is fixed here —
 * nothing from the scrape is ever placed in the host or the path's shape.
 */
export function bandcampArtUrl(artId: string | null | undefined, size: ArtSize): string | null {
  if (!artId || !/^\d{1,15}$/.test(artId)) return null;
  return `https://f4.bcbits.com/img/a${artId}_${ART_SIZES[size]}.jpg`;
}

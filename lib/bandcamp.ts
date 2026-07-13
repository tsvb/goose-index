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

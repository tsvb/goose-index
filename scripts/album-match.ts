/** Pure matching rules for the Bandcamp discography import. Kept out of
 * `import-albums.ts` because that script runs on import — a test can't touch it. */

/** A dated title ("2024-12-14 …") is a show tape, not a release. There are ~460
 * of them and they are not albums in any sense a fan would mean. */
const SHOW_TAPE = /^\d{4}[-./]\d{2}[-./]\d{2}/;

/** Official live albums. Bandcamp's own `is_live` flag can't be used for this —
 * it marks "Live at Madison Square Garden" as NOT live, because it means "is a
 * dated show release", not "is a live recording". So classify by title. */
const LIVE_ALBUM = /^live at\b|^live from\b|\(compilation\)|^\d{4}\.\d{2}\.\d{2}/i;

export type Kind = "studio" | "live";

/** Which shelf a release belongs on — or null if it isn't a release at all.
 *
 * Live is tested *first*, and the order matters: the officially-released live
 * compilations are dot-dated ("2019.11.16 Buffalo, NY (Compilation)"), so the
 * show-tape pattern swallows them if it goes first — quietly throwing away real
 * releases as if they were raw tapes. A raw tape is hyphen-dated and still
 * falls through to null. */
export function classify(title: string): Kind | null {
  if (LIVE_ALBUM.test(title)) return "live";
  if (SHOW_TAPE.test(title)) return null;
  return "studio";
}

/** Punctuation and case vary between Bandcamp and elgoose ("Don't" vs "Don’t"),
 * so compare on letters and digits only. */
export const normalizeTitle = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Title → song id, for matching a tracklist against the catalog.
 *
 * Two songs can share a name: elgoose carries both Goose's own "All I Need" and
 * a cover called "All I Need". A track on a Goose record is *their* song, so an
 * original always wins the name, and a cover only claims a title no original
 * wants.
 *
 * Getting this wrong is silent, and wrong in the worst direction: the album
 * track matched the cover, and the band's own song was filed as never released.
 */
export function buildTitleIndex(
  songs: { song_id: number; name: string; is_original?: boolean }[],
): Map<string, number> {
  const ordered = [...songs].sort(
    (a, b) => Number(b.is_original ?? false) - Number(a.is_original ?? false) || a.song_id - b.song_id,
  );
  const index = new Map<string, number>();
  for (const s of ordered) {
    const key = normalizeTitle(s.name);
    if (!index.has(key)) index.set(key, s.song_id);
  }
  return index;
}

import type { SongAlbum } from "@/lib/queries/songs";
import { bandcampHref } from "@/lib/bandcamp";

/** A one-track release is a single. Saying so matters: Goose put out both a
 * "Dripfield" single and a "Dripfield" album, and rendered as bare titles the two
 * read as a duplicate bug rather than two real releases. */
function releaseKind(a: SongAlbum): string {
  if (a.numTracks <= 1) return "single";
  if (a.numTracks <= 6) return `EP · ${a.numTracks} tracks`;
  return `${a.numTracks} tracks`;
}

/**
 * The releases a song is on, oldest first.
 *
 * We take the band's music and build a site out of it. The least we can do is
 * point at the shop where buying it actually pays them — so every release links
 * to Bandcamp, not to a streaming service.
 */
export function AppearsOn({ albums, minimal = false }: { albums: SongAlbum[]; minimal?: boolean }) {
  if (albums.length === 0) return null;

  if (minimal) {
    return (
      <p>
        <strong>Appears on:</strong>{" "}
        {albums.map((a, i) => {
          const href = bandcampHref(a.url);
          return (
            <span key={a.title + a.trackNum}>
              {i > 0 ? "; " : ""}
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer">{a.title}</a>
              ) : (
                a.title
              )}
              {a.releaseDate ? ` (${a.releaseDate.slice(0, 4)})` : ""}
            </span>
          );
        })}
      </p>
    );
  }

  return (
    <section className="mt-8">
      <span className="eyebrow">Appears on</span>
      <ul className="mt-3 flex flex-col gap-2">
        {albums.map((a) => {
          const href = bandcampHref(a.url);
          const meta = `${a.releaseDate ? a.releaseDate.slice(0, 4) + " · " : ""}${releaseKind(a)} · track ${a.trackNum}`;
          const body = (
            <>
              <span className="min-w-0 flex-1 truncate font-display text-ink group-hover:text-gold">{a.title}</span>
              <span className="shrink-0 font-mono text-[0.65rem] text-faint">{meta}</span>
              {href && (
                <span className="shrink-0 font-mono text-[0.62rem] text-sage group-hover:text-sage-deep">
                  Bandcamp&nbsp;↗
                </span>
              )}
            </>
          );
          return (
            <li key={a.title + a.trackNum}>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={`Buy ${a.title} from the band on Bandcamp`}
                  className="group flex items-center gap-3 rounded border border-line bg-surface/60 px-3.5 py-2.5 transition hover:border-sage/50 hover:bg-surface-2"
                >
                  {body}
                </a>
              ) : (
                <span className="flex items-center gap-3 rounded border border-line bg-surface/60 px-3.5 py-2.5">
                  {body}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

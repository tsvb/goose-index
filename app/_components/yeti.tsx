import { clsx } from "./clsx";
import { bandcampArtUrl, type ArtSize } from "@/lib/bandcamp";
import { dateParts } from "@/lib/queries/format";

// Yeti's one material, for 3.0 only (spec 2026-11-18, "The material").
// Server components; their CSS lives in globals.css under "3.0 (Yeti) —
// material", lifted from the Yeti app's token sheet (yeti-theme.html).
//
// Placement follows the app's own rules: the pack goes where something is on
// (tonight's show), the empty pack where nothing is yet (a show with no
// setlist); every other show is a flat date tile. Stickers mark states
// (Tonight, Live); facts get plain tags. The site plays nothing, so there is
// no play sticker or price sticker here.
//
// Art: a night the band has released on Bandcamp shows that release's cover,
// flat on the shelf (Yeti's "cover flat, no bubble"); every other night keeps
// the date tile. Tonight's show has no release yet, so its pack holds a printed
// poster of the date and the city — set from the show's own facts, never art
// the site doesn't have.

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** The date printed on card stock: Yeti's MonogramTile, the app's honest
 * stand-in when there is no art. Shows are squares. `iso` is YYYY-MM-DD. */
export function DateTile({ iso, className }: { iso: string; className?: string }) {
  const [y, m, d] = iso.split("-");
  return (
    <span aria-hidden="true" className={clsx("yeti-tile", className)}>
      <span className="yeti-tile-m">{MONTHS[Number(m) - 1] ?? ""}</span>
      <span className="yeti-tile-d">{Number(d)}</span>
      <span className="yeti-tile-y">{y}</span>
    </span>
  );
}

/** A release cover, flat: the square the date tile stands in for. The frost
 * keyline is drawn over the image so a dark cover keeps its edge. `alt` is
 * empty where the cover sits inside a link that already names the show. */
export function CoverTile({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    <span className={clsx("yeti-tile yeti-cover", className)}>
      {/* A plain img, not next/image: Bandcamp serves each size already cut,
          and the optimizer would spend the plan's quota redoing it. */}
      <img src={src} alt={alt} loading="lazy" decoding="async" width={700} height={700} />
    </span>
  );
}

/** A show's square: its Bandcamp cover when one is imported, else the date
 * tile. `size` picks the cut Bandcamp serves (thumb for rows, medium for a
 * page header). */
export function ShowSquare({
  iso,
  artId,
  size = "thumb",
  alt = "",
  className,
}: {
  iso: string;
  artId?: string | null;
  size?: ArtSize;
  alt?: string;
  className?: string;
}) {
  const src = bandcampArtUrl(artId, size);
  return src ? <CoverTile src={src} alt={alt} className={className} /> : <DateTile iso={iso} className={className} />;
}

/** Tonight's poster: what the bubble holds while the night has no release.
 * Printed like a gig bill from facts the show already has: the band, the city
 * set as large as its longest word allows, the region, and the date under a
 * sale rule (sale is "now" in this edition, and tonight is). Decorative — the
 * nameplate below carries the same facts as text — so it is hidden from
 * assistive tech. */
export function TonightPoster({
  iso,
  city,
  region,
}: {
  iso: string;
  city: string | null;
  region: string | null;
}) {
  const dp = dateParts(iso);
  const place = city ?? region ?? "";
  // Size the city by its longest word: the poster's width over that many
  // heavy-weight characters, so "Rochester" fills the line and
  // "Charlottesville" still fits. Multi-word cities wrap between words.
  const longest = Math.max(4, ...place.split(/\s+/).map((w) => w.length));
  return (
    <span aria-hidden="true" className="yeti-tile yeti-poster">
      <span className="yeti-poster-band">Goose</span>
      <span className="yeti-poster-city" style={{ "--chars": longest } as React.CSSProperties}>
        {place}
      </span>
      {city && region && <span className="yeti-poster-region">{region}</span>}
      <span className="yeti-poster-rule" />
      <span className="yeti-poster-date">
        {dp.weekday.slice(0, 3).toLowerCase()} · {dp.month.slice(0, 3).toLowerCase()} {dp.day}
      </span>
      <span className="yeti-poster-year">{dp.year}</span>
    </span>
  );
}

/** The blister pack: card stock with a punched hang slot and a clear bubble.
 * `empty` leaves the bubble empty (never animated, never a glyph); otherwise
 * it holds `art` (tonight's poster). The nameplate
 * is printed on the card below the bubble. */
export function Pack({
  art,
  sticker,
  children,
  className,
}: {
  art?: React.ReactNode;
  sticker?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("yeti-card", className)}>
      <div className="yeti-bubble-wrap">
        <div className={clsx("yeti-bubble", !art && "yeti-bubble-empty")}>{art}</div>
        {sticker && <span className="yeti-bubble-sticker">{sticker}</span>}
      </div>
      {children && <div className="yeti-nameplate">{children}</div>}
    </div>
  );
}

/** A state, on sticker stock: "Tonight", "Live". Night ink, 4° off true. */
export function LabelSticker({ children }: { children: React.ReactNode }) {
  return <span className="yeti-label">{children}</span>;
}

/** A fact, never on sticker stock: "debut", "first in 19 shows", "original".
 * Snow on translucent night, a frost-white keyline, set square. */
export function PlainTag({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={clsx("yeti-tag", className)}>{children}</span>;
}

/** The playing row's sticker: a sale disc holding Yeti's four-bar stair.
 * Static — it never bounces. The site can't know a song is on stage right
 * now (the live window is a date, and holds through set break and after the
 * encore), so the label says only what is known. */
export function RowSticker({ label = "newest song logged" }: { label?: string }) {
  return (
    <span className="yeti-rs" role="img" aria-label={label}>
      <span className="yeti-rs-stair" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
    </span>
  );
}

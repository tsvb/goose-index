import { clsx } from "./clsx";

// Yeti's one material, for 3.0 only (spec 2026-11-18, "The material").
// Server components; their CSS lives in globals.css under "3.0 (Yeti) —
// material", lifted from the Yeti app's token sheet (yeti-theme.html).
//
// Placement follows the app's own rules: the pack goes where something is on
// (tonight's show), the empty pack where nothing is yet (a show with no
// setlist); every other show is a flat date tile. Stickers mark states
// (Tonight, Live); facts get plain tags. The site plays nothing, so there is
// no play sticker or price sticker here.

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

/** The blister pack: card stock with a punched hang slot and a clear bubble.
 * `empty` leaves the bubble empty (never animated, never a glyph); otherwise
 * it holds `art` (a DateTile — the site has no show imagery). The nameplate
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
 * Static — it never bounces. */
export function RowSticker({ label = "on stage now" }: { label?: string }) {
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

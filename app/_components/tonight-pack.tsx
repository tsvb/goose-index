import Link from "next/link";
import { Pack, DateTile, LabelSticker } from "./yeti";
import { locationLine, showHref } from "@/lib/queries/format";
import type { ShowSummary } from "@/lib/queries/shows";

/** Tonight's show on 3.0's Home, in Yeti's blister pack: the one place on the
 * site where something is on. Until songs land the bubble is empty (Yeti's
 * "nothing yet" pack); once the setlist has entries it holds the date tile.
 * The Tonight sticker marks the state; the copy is TonightEntry's, unchanged. */
export function TonightPack({ show }: { show: ShowSummary }) {
  const loc = locationLine(show.city, show.state, show.country);
  return (
    <Link href={showHref(show.date, show.order)} className="tonight-pack group block max-w-[320px] rounded-[22px]">
      <Pack
        art={show.songCount > 0 ? <DateTile iso={show.date} /> : undefined}
        sticker={<LabelSticker>Tonight</LabelSticker>}
      >
        <h3 className="text-[1.6rem] font-black leading-[1.08] tracking-[-0.01em] text-ink underline-offset-4 group-hover:underline">
          {show.venue ?? "Unknown venue"}
        </h3>
        <p className="mt-1.5 text-[0.95rem] text-muted">
          {[loc || null, show.tour].filter(Boolean).join(" · ") || "—"}
        </p>
        <p className="mt-3 flex items-center gap-2 text-[0.875rem] lowercase text-muted">
          {show.order != null && <span className="text-faint">show {show.order} ·</span>}
          the setlist will appear live
        </p>
      </Pack>
    </Link>
  );
}

import Link from "next/link";
import { Pack, LabelSticker, TonightPoster } from "./yeti";
import { locationLine, showHref } from "@/lib/queries/format";
import type { ShowSummary } from "@/lib/queries/shows";

/** Tonight's show on 3.0's Home, in Yeti's blister pack: the one place on the
 * site where something is on. The bubble holds tonight's poster — the band,
 * the city, the date — since a night has no Bandcamp cover until its release
 * comes out. The Tonight sticker marks the state; the copy is TonightEntry's,
 * unchanged. */
/** `multi`: more than one show tonight, so each pack names its show number. */
export function TonightPack({ show, multi = false }: { show: ShowSummary; multi?: boolean }) {
  const loc = locationLine(show.city, show.state, show.country);
  return (
    <Link href={showHref(show.date, show.order)} className="tonight-pack group block max-w-[320px] rounded-[22px]">
      <Pack
        art={
          <TonightPoster
            iso={show.date}
            city={show.city}
            region={show.state ?? (show.country && show.country !== "USA" ? show.country : null)}
          />
        }
        sticker={<LabelSticker>Tonight</LabelSticker>}
      >
        <h3 className="text-[1.6rem] font-black leading-[1.08] tracking-[-0.01em] text-ink underline-offset-4 group-hover:underline">
          {show.venue ?? "Unknown venue"}
        </h3>
        <p className="mt-1.5 text-[0.95rem] text-muted">
          {[loc || null, show.tour].filter(Boolean).join(" · ") || "—"}
        </p>
        <p className="mt-3 flex items-center gap-2 text-[0.875rem] lowercase text-muted">
          {multi && show.order != null && <span className="text-faint">show {show.order} ·</span>}
          the setlist will appear live
        </p>
      </Pack>
    </Link>
  );
}

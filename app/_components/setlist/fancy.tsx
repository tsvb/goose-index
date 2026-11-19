import Link from "next/link";
import type { ReactNode } from "react";
import { Flame } from "../marks";
import { clsx } from "../clsx";
import { trackSeconds, formatDuration } from "@/lib/queries/format";
import type { SetlistEntry } from "@/lib/queries/shows";
import { groupSets, isSegue, footnoteRepeatsArtist } from "./shared";
import { SetTape } from "./tape";
import { NugsLink } from "../nugs-link";
import { nugsTrackHref, nugsWebFallback } from "@/lib/nugs";
import { PlainTag, RowSticker } from "../yeti";

export function SetlistFancy({
  entries, showDate, venue, containerId = null, live = false,
}: { entries: SetlistEntry[]; showDate: string; venue: string | null; containerId?: number | null; live?: boolean }) {
  // Nothing logged yet: the show header already says so, beside Yeti's empty
  // pack ("Setlist not yet in the ledger — check back soon"), so the body
  // adds no second nil sentence.
  if (entries.length === 0) return null;
  const groups = groupSets(entries);
  // While the show may be on stage, the newest logged song is the playing row:
  // Yeti's row sticker and a faint sale wash.
  const newest = live ? entries[entries.length - 1]?.uniqueId : undefined;

  return (
    <div className="space-y-10">
      {groups.map((g, gi) => {
        const secs = g.entries.map((e) => trackSeconds(e.trackTime)).filter((s): s is number => s != null);
        const total = secs.length >= Math.ceil(g.entries.length / 2) ? secs.reduce((a, b) => a + b, 0) : null;
        // The tape key prints once, under the first tape that actually draws
        // (a set with too few logged times draws no tape, so it can't carry it).
        const firstTape = groups.findIndex((x) => {
          const t = x.entries.map((e) => trackSeconds(e.trackTime)).filter((s) => s != null);
          return t.length >= Math.ceil(x.entries.length / 2);
        });
        // Footnote numbering restarts per set; jamchart notes share the endnote list.
        // A note that only repeats the cover artist printed on the row is not
        // numbered or listed (see footnoteRepeatsArtist).
        const fnIndex = new Map(
          g.entries.filter((e) => e.footnote && !footnoteRepeatsArtist(e)).map((e, i) => [e.uniqueId, i + 1]),
        );
        const hasNotes = fnIndex.size > 0 || g.entries.some((e) => e.isJamchart && e.jamchartNotes);

        return (
          <section key={g.key}>
            <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-line pb-2">
              {/* h2, not h3 — the show page's h1 (the date) is the only level
                  above; element only, styling unchanged. */}
              <h2 className="text-[1.2rem] font-black text-ink">{g.label}</h2>
              <span className="font-mono text-[0.7rem] text-faint">
                {g.entries.length} {g.entries.length === 1 ? "song" : "songs"}
                {total ? ` · ${formatDuration(total)}` : ""}
              </span>
            </div>

            <SetTape entries={g.entries} explain={gi === firstTape} />

            <ol>
              {g.entries.map((e, i) => {
                const prev = g.entries[i - 1];
                const segFromPrev = prev ? isSegue(prev.transition) : false;
                const segToNext = isSegue(e.transition);
                const inRun = segFromPrev || segToNext;
                const thread =
                  segFromPrev && segToNext
                    ? "before:top-0 before:h-full"
                    : segFromPrev
                      ? "before:top-0 before:h-1/2"
                      : "before:top-1/2 before:h-1/2";

                return (
                  <li
                    key={e.uniqueId}
                    className={clsx(
                      // setlist-row: almanac themes rule each row like ledger
                      // paper (globals.css); carries no styles elsewhere.
                      "setlist-row group relative flex items-baseline gap-3 border-t border-line py-[9px] pl-4 nugs-row first:border-t-0",
                      e.uniqueId === newest && "bg-[rgba(242,226,122,0.07)]",
                      inRun &&
                        "before:absolute before:left-[1px] before:w-[2px] before:rounded-full before:bg-steel/45",
                      inRun && thread,
                    )}
                  >
                    <span className="w-5 shrink-0 self-center text-right font-mono text-[0.75rem] tabular-nums text-faint">
                      {e.uniqueId === newest ? <RowSticker label="newest song, on stage now" /> : i + 1}
                    </span>
                    <span className="flex-1 leading-snug">
                      {segFromPrev && <span className="mr-1 select-none text-steel">›</span>}
                      {e.slug
                        ? <Link href={`/songs/${e.slug}`} className={clsx("text-[1.02rem] font-semibold hover:underline", e.uniqueId === newest ? "text-[var(--sale)]" : "text-ink")}>{e.song}</Link>
                        : <span className={clsx("text-[1.02rem] font-semibold", e.uniqueId === newest ? "text-[var(--sale)]" : "text-ink")}>{e.song}</span>}
                      {/* Heat wears ember, everywhere heat appears (flames,
                          Dusted Off); steel stays structural — segue carets,
                          rules. The XL II discipline, applied to all fancy
                          themes. */}
                      {e.isJamchart && (
                        <span title={e.jamchartNotes ?? "Jam chart"}>
                          <Flame className="ml-1.5 inline h-[15px] w-[15px] -translate-y-px text-ember" strokeWidth={1.7} />
                        </span>
                      )}
                      {e.isDustedOff && (
                        <span title={`First play in ${e.gap} shows`}>
                          <PlainTag className="ml-2">first in {e.gap} shows</PlainTag>
                        </span>
                      )}
                      {!e.isOriginal && e.originalArtist && (
                        <span className="ml-2 align-baseline text-[0.8rem] text-muted">{e.originalArtist}</span>
                      )}
                      {fnIndex.has(e.uniqueId) && (
                        <sup className="ml-0.5">
                          <a
                            href={`#fn-${e.uniqueId}`}
                            aria-label={`Footnote ${fnIndex.get(e.uniqueId)} for ${e.song}`}
                            className="font-mono text-[0.65rem] text-spruce hover:underline"
                          >
                            {fnIndex.get(e.uniqueId)}
                          </a>
                        </sup>
                      )}
                    </span>
                    {e.trackTime && (
                      <span className="shrink-0 font-mono text-[0.72rem] tabular-nums text-muted">{e.trackTime}</span>
                    )}
                    <NugsLink
                      href={nugsTrackHref({ date: showDate, venue, song: e.song, set: e.setNumber, pos: e.position })}
                      fallback={nugsWebFallback({ date: showDate, venue, containerId })}
                      className="nugs-track ml-1 shrink-0"
                      title={`Listen to ${e.song} on nugs`}
                      ariaLabel={`Listen to ${e.song} on nugs`}
                    >▷</NugsLink>
                  </li>
                );
              })}
            </ol>

            {/* The notes are set off from the setlist twice over: a hairline
                above them, the full width of the set like the rule under its
                heading, and an indent. The notes start where the song names
                start (pl-12 = a row's pad + marker column + gap), so the note
                numbers hang under the song titles and the note text sits one
                step further in. Smaller and all in the muted ink: an annotation
                to the list, not a second list competing with it. */}
            {hasNotes && (
              <ul className="mt-3 space-y-1 border-t border-line-soft pl-12 pt-3">
                {g.entries.flatMap((e) => {
                  const items: ReactNode[] = [];
                  if (fnIndex.has(e.uniqueId)) {
                    items.push(
                      <li key={`fn-${e.uniqueId}`} id={`fn-${e.uniqueId}`} className="flex items-baseline gap-2.5 text-[0.78rem] leading-relaxed text-muted">
                        <span className="w-3.5 shrink-0 font-mono text-[0.65rem] text-spruce">{fnIndex.get(e.uniqueId)}</span>
                        <span>{e.song} — {e.footnote}</span>
                      </li>,
                    );
                  }
                  if (e.isJamchart && e.jamchartNotes) {
                    items.push(
                      <li key={`jam-${e.uniqueId}`} className="flex items-baseline gap-2.5 text-[0.78rem] leading-relaxed text-muted">
                        <span className="flex w-3.5 shrink-0">
                          <Flame className="h-3 w-3 translate-y-px text-ember" strokeWidth={1.7} />
                        </span>
                        <span>{e.song} — {e.jamchartNotes}</span>
                      </li>,
                    );
                  }
                  return items;
                })}
              </ul>
            )}
          </section>
        );
      })}

      {/* Legend — the almanac explains its own marks. Keep in step with what
          the rows above actually render: segue carets, jam-chart flames, and
          numbered endnotes. (Dusted Off is a plain tag that names itself —
          "first in n shows" — so it needs no separate legend entry.) */}
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line-soft pt-3 font-mono text-[0.65rem] leading-relaxed text-faint">
        <span className="font-bold">reading the ledger</span>
        <span><span className="text-steel">›</span> = segue</span>
        <span><Flame className="inline h-3 w-3 -translate-y-px text-ember" strokeWidth={1.7} /> = jam chart pick</span>
        <span><span className="text-spruce">¹</span> = see the notes under each set</span>
      </p>
    </div>
  );
}

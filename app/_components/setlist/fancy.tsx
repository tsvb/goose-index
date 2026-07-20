import Link from "next/link";
import type { ReactNode } from "react";
import { Flame } from "../marks";
import { clsx } from "../clsx";
import { trackSeconds, formatDuration, RETURN_LABEL } from "@/lib/queries/format";
import type { SetlistEntry } from "@/lib/queries/shows";
import { groupSets, isSegue } from "./shared";
import { SetTape } from "./tape";
import { NugsLink } from "../nugs-link";
import { nugsTrackHref, nugsWebFallback } from "@/lib/nugs";

export function SetlistFancy({ entries, showDate, venue }: { entries: SetlistEntry[]; showDate: string; venue: string | null }) {
  if (entries.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-line bg-surface/50 px-5 py-8 text-center text-muted">
        No setlist has been recorded for this show yet.
      </p>
    );
  }
  const groups = groupSets(entries);

  return (
    <div className="space-y-10">
      {groups.map((g) => {
        const secs = g.entries.map((e) => trackSeconds(e.trackTime)).filter((s): s is number => s != null);
        const total = secs.length >= Math.ceil(g.entries.length / 2) ? secs.reduce((a, b) => a + b, 0) : null;
        // Footnote numbering restarts per set; jamchart notes share the endnote list.
        const fnIndex = new Map(g.entries.filter((e) => e.footnote).map((e, i) => [e.uniqueId, i + 1]));
        const hasNotes = fnIndex.size > 0 || g.entries.some((e) => e.isJamchart && e.jamchartNotes);

        return (
          <section key={g.key}>
            <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-line pb-2">
              {/* h2, not h3 — the show page's h1 (the date) is the only level
                  above; element only, styling unchanged. */}
              <h2 className="font-display text-xl text-ink">{g.label}</h2>
              <span className="font-mono text-[0.7rem] text-faint">
                {g.entries.length} {g.entries.length === 1 ? "song" : "songs"}
                {total ? ` · ${formatDuration(total)}` : ""}
              </span>
            </div>

            <SetTape entries={g.entries} />

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
                      "setlist-row group relative flex items-baseline gap-3 py-[7px] pl-4 nugs-row",
                      inRun &&
                        "before:absolute before:left-[1px] before:w-[2px] before:rounded-full before:bg-gold/45",
                      inRun && thread,
                    )}
                  >
                    <span className="w-5 shrink-0 text-right font-mono text-[0.7rem] tabular-nums text-faint">
                      {i + 1}
                    </span>
                    <span className="flex-1 leading-snug">
                      {segFromPrev && <span className="mr-1 select-none text-gold">›</span>}
                      {e.slug
                        ? <Link href={`/songs/${e.slug}`} className="text-[1.02rem] text-ink hover:underline">{e.song}</Link>
                        : <span className="text-[1.02rem] text-ink">{e.song}</span>}
                      {/* Heat wears ember, everywhere heat appears (flames,
                          Dusted Off); gold stays structural — segue carets,
                          rules. The XL II discipline, applied to all fancy
                          themes. */}
                      {e.isJamchart && (
                        <span title={e.jamchartNotes ?? "Jam chart"}>
                          <Flame className="ml-1.5 inline h-[15px] w-[15px] -translate-y-px text-ember" strokeWidth={1.7} />
                        </span>
                      )}
                      {e.isDustedOff && <span title={`First play in ${e.gap} shows`} className="ml-2 inline-block whitespace-nowrap rounded-full border border-ember/45 px-2 py-0.5 align-middle font-mono text-[0.6rem] text-ember">{RETURN_LABEL} · {e.gap}</span>}
                      {!e.isOriginal && e.originalArtist && (
                        <span className="ml-2 align-baseline text-xs italic text-faint">{e.originalArtist}</span>
                      )}
                      {e.footnote && (
                        <sup className="ml-0.5">
                          <a
                            href={`#fn-${e.uniqueId}`}
                            aria-label={`Footnote ${fnIndex.get(e.uniqueId)} for ${e.song}`}
                            className="font-mono text-[0.65rem] text-sage hover:underline"
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
                      fallback={nugsWebFallback({ date: showDate, venue })}
                      className="nugs-track ml-1 shrink-0"
                      title={`Listen to ${e.song} on nugs`}
                      ariaLabel={`Listen to ${e.song} on nugs`}
                    >▷</NugsLink>
                  </li>
                );
              })}
            </ol>

            {hasNotes && (
              <ul className="mt-4 space-y-2 border-t border-line-soft pt-3">
                {g.entries.flatMap((e) => {
                  const items: ReactNode[] = [];
                  if (e.footnote) {
                    items.push(
                      <li key={`fn-${e.uniqueId}`} id={`fn-${e.uniqueId}`} className="flex gap-2.5 text-[0.82rem] leading-relaxed text-muted">
                        <span className="mt-0.5 w-3.5 shrink-0 text-right font-mono text-[0.7rem] text-sage">{fnIndex.get(e.uniqueId)}</span>
                        <span>
                          <span className="text-ink">{e.song}</span> — {e.footnote}
                        </span>
                      </li>,
                    );
                  }
                  if (e.isJamchart && e.jamchartNotes) {
                    items.push(
                      <li key={`jam-${e.uniqueId}`} className="flex gap-2.5 text-[0.82rem] leading-relaxed text-muted">
                        <Flame className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ember" strokeWidth={1.7} />
                        <span>
                          <span className="text-ink">{e.song}</span> — {e.jamchartNotes}
                        </span>
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
          the rows above actually render: segue carets, jam-chart flames,
          numbered endnotes, and the Dusted Off pill. */}
      <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-line-soft pt-3 font-mono text-[0.65rem] leading-relaxed text-faint">
        <span className="uppercase tracking-[0.18em]">Reading the ledger</span>
        <span><span className="text-gold">›</span> = segue</span>
        <span><Flame className="inline h-3 w-3 -translate-y-px text-ember" strokeWidth={1.7} /> = jam chart pick</span>
        <span><span className="text-sage">¹</span> = see the notes under each set</span>
        <span><span className="text-ember">{RETURN_LABEL} · n</span> = first play in n shows</span>
      </p>
    </div>
  );
}

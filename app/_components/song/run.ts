import type { SongPerf } from "@/lib/queries/songs";

/**
 * 3.0's song page, as Yeti would read a track (spec 2026-11-18, round 5). Pure,
 * so the run, the record and the year shares are tested without a database.
 */

/** A night the song was played, as a position in the band's shows since its
 * debut (0 = the debut). `returned` marks a Dusted Off return. */
export type RunMark = { at: number; returned: boolean };

export type SongRun = {
  marks: RunMark[];
  /** Shows from the debut through today, so the track's right end is now. */
  total: number;
  /** The longest finished gap, as positions [from, to), or null if none is over a show. */
  longest: { from: number; to: number } | null;
};

/** The song's whole run, laid out in shows. A performance's `gap` is the shows
 * between it and the previous play, so each play sits `gap + 1` after the last;
 * a reprise in the same show is one night, not two. */
export function songRun(perfs: SongPerf[], currentGap: number | null): SongRun {
  const oldestFirst = [...perfs].reverse();
  const marks: RunMark[] = [];
  let lastShow: number | null = null;
  let at = 0;
  for (const p of oldestFirst) {
    if (p.showId === lastShow) continue;
    at = marks.length === 0 ? 0 : at + (p.gap ?? 0) + 1;
    marks.push({ at, returned: p.isDustedOff });
    lastShow = p.showId;
  }
  const lastAt = marks.length ? marks[marks.length - 1].at : 0;
  let longest: SongRun["longest"] = null;
  for (let i = 1; i < marks.length; i++) {
    const span = marks[i].at - marks[i - 1].at;
    if (span > 1 && (!longest || span > longest.to - longest.from)) longest = { from: marks[i - 1].at, to: marks[i].at };
  }
  return { marks, total: lastAt + (currentGap ?? 0) + 1, longest };
}

/** Is the song in the longest absence of its life? Its current gap has passed
 * every finished one. */
export function goneForRecord(currentGap: number | null, longestGap: number | null): boolean {
  return currentGap != null && longestGap != null && longestGap > 0 && currentGap > longestGap;
}

/** How far the gap ring has closed: the current gap against the song's own
 * longest, full once it passes it. */
export function gapFraction(currentGap: number | null, longestGap: number | null): number {
  if (!currentGap || !longestGap) return 0;
  return Math.min(currentGap / longestGap, 1);
}

export type YearShare = { year: number; shows: number; setlists: number | null };

/** Each year from the song's first to its last on the record: the shows it was
 * played at (distinct shows, so a reprise doesn't count twice) out of that
 * year's shows with a setlist. */
export function yearShares(years: number[], perfs: SongPerf[], setlists: Map<number, number>): YearShare[] {
  const shows = new Map<number, Set<number>>();
  for (const p of perfs) {
    const y = Number(p.date.slice(0, 4));
    if (!shows.has(y)) shows.set(y, new Set());
    shows.get(y)!.add(p.showId);
  }
  return years.map((year) => ({ year, shows: shows.get(year)?.size ?? 0, setlists: setlists.get(year) ?? null }));
}

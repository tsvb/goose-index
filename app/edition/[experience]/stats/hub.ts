import { halfPoint, tailStart } from "./catalog-profile";

/**
 * 3.0's stats hub opens with the catalog profile's reading said outright (spec
 * 2026-11-18, round 6): the staples that carry half the plays, the rest of the
 * rotation, and the rarities' tail — once as a share of the songs and once as a
 * share of the plays, so the inversion shows. Pure; the same `halfPoint` and
 * `tailStart` the 2.0 profile draws from, so the two editions can't disagree.
 */
export type CatalogGroup = { songs: number; plays: number };
export type CatalogSplit = { head: CatalogGroup; rest: CatalogGroup; tail: CatalogGroup; songs: number; plays: number };

/** `plays` is every played song's count, most played first. */
export function catalogSplit(plays: number[], tailMax: number): CatalogSplit | null {
  if (plays.length === 0) return null;
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const k = halfPoint(plays);
  // The tail never reaches into the head: a tiny catalog's half-point can sit
  // among songs at the rarity ceiling.
  const t = Math.max(k, tailStart(plays, tailMax));
  const head = plays.slice(0, k);
  const rest = plays.slice(k, t);
  const tail = plays.slice(t);
  return {
    head: { songs: head.length, plays: sum(head) },
    rest: { songs: rest.length, plays: sum(rest) },
    tail: { songs: tail.length, plays: sum(tail) },
    songs: plays.length,
    plays: sum(plays),
  };
}

/** Whole percent, never 0 for a nonzero share (a sliver still says it's there). */
export function sharePct(part: number, whole: number): number {
  if (whole <= 0 || part <= 0) return 0;
  return Math.max(1, Math.round((part / whole) * 100));
}

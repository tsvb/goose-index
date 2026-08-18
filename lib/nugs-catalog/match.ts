import type { NugsContainer } from "./parse";

/** Lowercased, accent-folded, punctuation-stripped. Mirrors DeepLinkMatch.normalize
 *  in tsvb/applenugs so the site and the app break ties the same way. */
export function normalizeVenue(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // strip combining marks left by NFD
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Bidirectional containment: "Salt Shed" should match "The Salt Shed, Chicago"
 *  and the reverse. An absent or empty side never matches. */
export function venueMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeVenue(a), nb = normalizeVenue(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

/** The container for one show, or null.
 *
 *  Date is the join key. A single container on the date wins outright — the venue
 *  is a tie-breaker, not a verifier, because our venue spelling and nugs's differ
 *  more often than two shows share a date.
 *
 *  Ambiguity resolves to null on purpose: an unmatched show falls back to the
 *  artist+date search, which is the behaviour that shipped before this feature.
 *  Guessing would send someone to the wrong night, which is worse than a search. */
export function resolveContainer(
  show: { date: string; venue: string | null },
  candidates: NugsContainer[],
): NugsContainer | null {
  const sameDate = candidates.filter((c) => c.performanceDate === show.date);
  if (sameDate.length === 0) return null;
  if (sameDate.length === 1) return sameDate[0];

  const byVenue = sameDate.filter((c) => venueMatches(show.venue, c.venueName));
  return byVenue.length === 1 ? byVenue[0] : null;
}

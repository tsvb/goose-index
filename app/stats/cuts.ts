import { OVERDUE_MIN_PLAYS, type SongSort } from "@/lib/queries/songs";

export type CutMeta = {
  slug: string;
  title: string;
  blurb: string;
  /** One-line methodology — criteria + row limit — shown as a footnote on the cut page. */
  note: string;
  /** The /songs sort that reproduces this cut across the whole catalog, when one exists. */
  songsSort?: SongSort;
};

export const CUTS: CutMeta[] = [
  { slug: "most-played", title: "Most Played", blurb: "The backbone of the catalog.",
    note: "Every played song, ranked by total plays · top 100", songsSort: "played" },
  { slug: "rarities", title: "Rarities", blurb: "Rare originals and covers that came back.",
    note: "Songs played 3 times or fewer, one-off covers excluded · top 100", songsSort: "rare" },
  { slug: "current-gaps", title: "Most Overdue", blurb: "In rotation, but missing lately.",
    note: `Songs played ≥${OVERDUE_MIN_PLAYS} times, ranked by current gap (shows since last played) · top 100`, songsSort: "overdue" },
  { slug: "debuts", title: "Debuts", blurb: "What's new, and when.",
    note: "Each song's first performance · latest 25 listed", songsSort: "debut" },
  { slug: "set-stats", title: "Set Stats", blurb: "Openers and encores.",
    note: "Openers and encores counted across every played show · top 15 per bucket" },
  { slug: "oracle", title: "Oracle", blurb: "Wild discoveries and deep patterns.",
    note: "Flow-state segues, dusty originals, and venues that pull the deepest jams." },
];

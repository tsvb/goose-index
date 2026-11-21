// What one Bandcamp live release writes onto its show. Pure, so the rules can
// be tested without a database; scripts/import-bandcamp.ts does the matching
// and the writes.

export type LiveRelease = {
  album_id: number;
  url: string;
  is_live: boolean;
  show_date: string | null;
  art_id?: number | null;
  notes_raw: string | null;
};

export type ShowPatch = {
  bandcampAlbumId: string;
  bandcampUrl: string;
  bandcampArtId: string | null;
  coachNotes?: string;
};

/** A release that is a recording of one dated show. */
export function isShowRelease(a: LiveRelease): a is LiveRelease & { show_date: string } {
  return Boolean(a.is_live && a.show_date);
}

/**
 * The columns a release sets. Every show release links its show and its cover;
 * only a release that carries notes sets the coach's notes, so a release
 * without them never blanks notes an earlier import stored.
 */
export function showPatch(a: LiveRelease): ShowPatch {
  const artId = a.art_id != null && Number.isSafeInteger(a.art_id) && a.art_id > 0 ? String(a.art_id) : null;
  return {
    bandcampAlbumId: String(a.album_id),
    bandcampUrl: a.url,
    bandcampArtId: artId,
    ...(a.notes_raw ? { coachNotes: a.notes_raw } : {}),
  };
}

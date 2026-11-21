import { describe, expect, it } from "vitest";
import { isShowRelease, showPatch, type LiveRelease } from "./bandcamp-patch";

const release = (over: Partial<LiveRelease> = {}): LiveRelease => ({
  album_id: 1234,
  url: "https://goosetheband.bandcamp.com/album/2026-11-20-pittsburgh-pa",
  is_live: true,
  show_date: "2026-11-20",
  art_id: 3912345678,
  notes_raw: "Coach's notes…",
  ...over,
});

describe("isShowRelease", () => {
  it("takes dated live releases only", () => {
    expect(isShowRelease(release())).toBe(true);
    expect(isShowRelease(release({ notes_raw: null }))).toBe(true);
    expect(isShowRelease(release({ is_live: false }))).toBe(false);
    expect(isShowRelease(release({ show_date: null }))).toBe(false);
  });
});

describe("showPatch", () => {
  it("links the show, its cover and its notes", () => {
    expect(showPatch(release())).toEqual({
      bandcampAlbumId: "1234",
      bandcampUrl: "https://goosetheband.bandcamp.com/album/2026-11-20-pittsburgh-pa",
      bandcampArtId: "3912345678",
      coachNotes: "Coach's notes…",
    });
  });

  // A release without notes still has a cover and a link, but must not blank
  // the notes an earlier import stored.
  it("leaves coach notes alone when the release has none", () => {
    const p = showPatch(release({ notes_raw: null }));
    expect(p).not.toHaveProperty("coachNotes");
    expect(p.bandcampArtId).toBe("3912345678");
  });

  it("stores no art id it can't trust", () => {
    expect(showPatch(release({ art_id: null })).bandcampArtId).toBeNull();
    expect(showPatch(release({ art_id: undefined })).bandcampArtId).toBeNull();
    expect(showPatch(release({ art_id: 0 })).bandcampArtId).toBeNull();
    expect(showPatch(release({ art_id: 1.5 })).bandcampArtId).toBeNull();
  });
});

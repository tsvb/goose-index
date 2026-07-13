import { describe, it, expect } from "vitest";
import { classify, normalizeTitle, buildTitleIndex } from "./album-match";

describe("classify", () => {
  it("keeps the discography", () => {
    expect(classify("BIG MODERN!")).toBe("studio");
    expect(classify("Everything Must Go")).toBe("studio");
    expect(classify("Chateau Sessions pt III")).toBe("studio");
    expect(classify("Ted Tapes 2024")).toBe("studio");
    expect(classify("Dripfield")).toBe("studio");
  });

  it("separates the official live albums", () => {
    // Bandcamp's own is_live flag marks these as NOT live — it means "is a dated
    // show release", not "is a live recording" — so it can't be used here.
    expect(classify("Live at Madison Square Garden")).toBe("live");
    expect(classify("Live at The Capitol Theatre")).toBe("live");
    expect(classify("2019.11.16 Buffalo, NY (Compilation)")).toBe("live");
  });

  it("throws out the ~460 show tapes, which are not albums at all", () => {
    expect(classify("2024-12-14 North Charleston Coliseum")).toBeNull();
    expect(classify("2026/07/04 SPAC")).toBeNull();
  });
});

describe("normalizeTitle", () => {
  it("survives the punctuation drift between Bandcamp and elgoose", () => {
    expect(normalizeTitle("Don’t Leave Me This Way")).toBe(normalizeTitle("Don't Leave Me This Way"));
    expect(normalizeTitle("Good Times // End Times")).toBe("good times end times");
    expect(normalizeTitle("  SALT ")).toBe("salt");
  });
});

// The bug this exists to prevent: elgoose carries both Goose's own "All I Need"
// and a cover of the same name. Keyed on name alone, the map kept whichever came
// last — so the album track matched the *cover*, and the band's own song was
// filed as never released. Silent, and wrong in the worst direction.
describe("buildTitleIndex", () => {
  const songs = [
    { song_id: 900, name: "All I Need", is_original: false }, // a cover, listed first
    { song_id: 100, name: "All I Need", is_original: true }, // Goose's own
    { song_id: 200, name: "Rockdale", is_original: true },
  ];

  it("gives a shared name to the original, never the cover", () => {
    const index = buildTitleIndex(songs);
    expect(index.get("all i need")).toBe(100);
  });

  it("does not depend on the order rows arrive in", () => {
    expect(buildTitleIndex([...songs].reverse()).get("all i need")).toBe(100);
  });

  it("still matches a cover when no original claims the title", () => {
    const index = buildTitleIndex([{ song_id: 700, name: "Bob Don", is_original: false }]);
    expect(index.get("bob don")).toBe(700);
  });

  it("breaks a tie between two covers deterministically, by id", () => {
    const index = buildTitleIndex([
      { song_id: 500, name: "Revival", is_original: false },
      { song_id: 400, name: "Revival", is_original: false },
    ]);
    expect(index.get("revival")).toBe(400);
  });
});

import { describe, it, expect } from "vitest";
import { normalizeVenue, venueMatches, resolveContainer } from "./match";
import type { NugsContainer } from "./parse";

const c = (containerId: number, performanceDate: string, venueName: string | null): NugsContainer =>
  ({ containerId, performanceDate, venueName, venueCity: null, venueState: null, hasVideo: false });

describe("normalizeVenue", () => {
  it("folds case, accents and punctuation", () => {
    expect(normalizeVenue("The Salt Shed")).toBe("the salt shed");
    expect(normalizeVenue("Théâtre  St-Denis!")).toBe("theatre st denis");
    expect(normalizeVenue(null)).toBe("");
  });

  // Venue data carries both the ASCII and typographic apostrophe. Dropping them
  // outright (rather than turning them into a space) is what lets a hint of
  // "Slims" match a nugs venue of "Slim's".
  it("deletes apostrophes rather than spacing them out", () => {
    expect(normalizeVenue("Slim's")).toBe("slims");
    expect(normalizeVenue("Slim’s")).toBe("slims");
  });
  it("still spaces out other punctuation, with no double spaces", () => {
    expect(normalizeVenue("Théâtre St-Denis")).toBe("theatre st denis");
    expect(normalizeVenue("Music & Arts Fest")).toBe("music arts fest");
  });
});

describe("venueMatches", () => {
  it("matches in either direction — a hint may be shorter or longer", () => {
    expect(venueMatches("Salt Shed", "The Salt Shed, Chicago")).toBe(true);
    expect(venueMatches("The Salt Shed, Chicago", "Salt Shed")).toBe(true);
  });
  it("matches across an apostrophe difference", () => {
    expect(venueMatches("Slims", "Slim's, San Francisco")).toBe(true);
  });
  it("does not match different venues", () => {
    expect(venueMatches("Red Rocks", "The Salt Shed")).toBe(false);
  });
  it("an absent side never matches", () => {
    expect(venueMatches(null, "The Salt Shed")).toBe(false);
    expect(venueMatches("The Salt Shed", null)).toBe(false);
    expect(venueMatches("", "")).toBe(false);
  });
});

describe("resolveContainer", () => {
  it("returns null when nothing shares the date", () => {
    expect(resolveContainer({ date: "2024-04-20", venue: "The Salt Shed" },
      [c(1, "2024-04-21", "The Salt Shed")])).toBeNull();
  });

  it("takes the only container on that date, venue or not", () => {
    expect(resolveContainer({ date: "2024-04-20", venue: "Somewhere Else" },
      [c(1, "2024-04-20", "The Salt Shed")])?.containerId).toBe(1);
    expect(resolveContainer({ date: "2024-04-20", venue: null },
      [c(1, "2024-04-20", "The Salt Shed")])?.containerId).toBe(1);
  });

  // Real same-date pairs as of 2026-08-18: 2022-07-22, 2025-05-10, 2026-05-09.
  it("breaks a two-show day on the venue", () => {
    const day = [c(1, "2025-05-10", "Hollywood Bowl"), c(2, "2025-05-10", "The Greek Theatre")];
    expect(resolveContainer({ date: "2025-05-10", venue: "Greek Theatre" }, day)?.containerId).toBe(2);
    expect(resolveContainer({ date: "2025-05-10", venue: "Hollywood Bowl" }, day)?.containerId).toBe(1);
  });

  it("leaves a two-show day unmatched when the venue can't break it", () => {
    const day = [c(1, "2022-07-22", "Petersen Events Center"), c(2, "2022-07-22", "Stage AE")];
    expect(resolveContainer({ date: "2022-07-22", venue: null }, day)).toBeNull();
    expect(resolveContainer({ date: "2022-07-22", venue: "Somewhere Else" }, day)).toBeNull();
  });

  it("leaves it unmatched when the venue matches more than one candidate", () => {
    const day = [c(1, "2026-05-09", "The Capitol Theatre"), c(2, "2026-05-09", "Capitol Theatre")];
    expect(resolveContainer({ date: "2026-05-09", venue: "Capitol Theatre" }, day)).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { mapVenue, mapSong, mapShow, mapTour, mapPerformance } from "./mappers";
import type { RawVenue, RawSong, RawShow, RawSetlistRow } from "./types";

describe("mapVenue", () => {
  it("maps venue fields", () => {
    const raw: RawVenue = { venue_id: 1, venuename: "Madison Theater", city: "Covington",
      state: "KY", country: "USA", zip: "41011", capacity: 1200, slug: "madison-theater" };
    expect(mapVenue(raw)).toEqual({ venueId: 1, name: "Madison Theater", slug: "madison-theater",
      city: "Covington", state: "KY", country: "USA", zip: "41011", capacity: 1200 });
  });
});

describe("mapSong", () => {
  it("uses `id` as songId and coerces isoriginal", () => {
    const raw: RawSong = { id: 400, name: "Turned Clouds", slug: "turned-clouds",
      isoriginal: 1, original_artist: "Goose" };
    expect(mapSong(raw)).toEqual({ songId: 400, name: "Turned Clouds", slug: "turned-clouds",
      isOriginal: true, originalArtist: "Goose" });
  });
  it("maps a cover (isoriginal 0) keeping original_artist", () => {
    const raw: RawSong = { id: 9, name: "Hot Tea", slug: "hot-tea", isoriginal: 0,
      original_artist: "moe." };
    expect(mapSong(raw).isOriginal).toBe(false);
    expect(mapSong(raw).originalArtist).toBe("moe.");
  });
});

describe("mapTour", () => {
  it("maps tour_id/tourname/year (show_year or showyear)", () => {
    expect(mapTour({ tour_id: 29, tourname: "Dripfield Summer Tour 2022", showyear: 2022 }))
      .toEqual({ tourId: 29, name: "Dripfield Summer Tour 2022", year: 2022 });
  });
});

describe("mapShow", () => {
  it("maps show fields and attaches notes; empty title -> null; tour_id 0 -> null", () => {
    const raw: RawShow = { show_id: 1, showdate: "2022-06-24", permalink: "p.html", artist_id: 1,
      showtitle: "", venue_id: 290, tour_id: 0, tourname: "", showorder: 1, show_year: 2022,
      created_at: "2022-01-01 00:00:00", updated_at: "2022-02-01 00:00:00" };
    expect(mapShow(raw, "first set acoustic")).toEqual({ showId: 1, showDate: "2022-06-24",
      artistId: 1, venueId: 290, tourId: null, title: null, permalink: "p.html", showOrder: 1,
      notes: "first set acoustic", createdAt: "2022-01-01 00:00:00", updatedAt: "2022-02-01 00:00:00" });
  });
});

describe("mapPerformance", () => {
  it("maps a setlist row, coercing flags and emptying track time", () => {
    const raw = { uniqueid: "12301", show_id: 1, song_id: 735, settype: "Set", setnumber: "1",
      position: 1, tracktime: "8:46", transition_id: 1, transition: ", ", footnote: "",
      isjamchart: 0, jamchart_notes: null, venue_id: 290, shownotes: "x", tour_id: 29,
      tourname: "t", isverified: 1, isoriginal: 1, original_artist: "", isreprise: 0, isjam: 0,
      showdate: "2022-06-24", songname: "California Magic", artist_id: 1 } as RawSetlistRow;
    expect(mapPerformance(raw)).toEqual({ uniqueId: "12301", showId: 1, songId: 735,
      setType: "Set", setNumber: "1", position: 1, trackTime: "8:46", transition: ", ",
      transitionId: 1, isJamchart: false, jamchartNotes: null, isReprise: false, isJam: false,
      isVerified: true, footnote: null });
  });
  it("maps a segue + jamchart row", () => {
    const raw = { uniqueid: "5", show_id: 1, song_id: 2, settype: "Set", setnumber: "2",
      position: 3, tracktime: "", transition_id: 2, transition: " > ", footnote: "fn",
      isjamchart: 1, jamchart_notes: "huge jam", venue_id: 1, shownotes: "", tour_id: 1,
      tourname: "t", isverified: 1, isoriginal: 1, original_artist: "", isreprise: 0, isjam: 1,
      showdate: "2022-06-24", songname: "Arcadia", artist_id: 1 } as RawSetlistRow;
    const m = mapPerformance(raw);
    expect(m.transition).toBe(" > ");
    expect(m.isJamchart).toBe(true);
    expect(m.jamchartNotes).toBe("huge jam");
    expect(m.trackTime).toBeNull();
    expect(m.isJam).toBe(true);
    expect(m.footnote).toBe("fn");
  });
});

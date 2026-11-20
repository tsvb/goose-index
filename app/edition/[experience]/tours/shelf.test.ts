import { describe, it, expect } from "vitest";
import { shelveTours, runPlace, ringArcs, runRoute, spanLabel, weeksOut, yearFraction } from "./shelf";
import type { TourRun } from "@/lib/queries/dimensions";

function run(tourId: number, dates: string[], places: (string | null)[] = []): TourRun {
  return {
    tourId,
    name: `Tour ${tourId}`,
    start: dates[0],
    end: dates[dates.length - 1],
    shows: dates.length,
    upcoming: 0,
    dates,
    places,
  };
}

const FALL = run(45, ["2026-11-03", "2026-11-04", "2026-11-10", "2026-11-13", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21"]);
const SPRING_27 = run(46, ["2027-04-09", "2027-04-18"]);
// Two legs: home Jul 5 – Aug 12.
const SUMMER = run(44, ["2026-06-13", "2026-06-20", "2026-06-27", "2026-07-04", "2026-08-13", "2026-08-20", "2026-08-27", "2026-09-02"]);
const OLD = run(10, ["2024-06-01", "2024-06-20"]);

describe("shelveTours", () => {
  it("files the run bracketing today as on the road, the rest by when", () => {
    const s = shelveTours([OLD, SUMMER, FALL, SPRING_27], "2026-11-19");
    expect(s.running?.tourId).toBe(45);
    expect(s.upcoming.map((r) => r.tourId)).toEqual([46]);
    expect(s.justBack).toBeNull();
    expect(s.crate.map((r) => r.tourId)).toEqual([44, 10]);
  });

  it("with nothing running, shelves the latest run as just back and keeps it out of the crate", () => {
    const s = shelveTours([OLD, SUMMER, FALL, SPRING_27], "2026-12-01");
    expect(s.running).toBeNull();
    expect(s.justBack?.tourId).toBe(45);
    expect(s.crate.map((r) => r.tourId)).toEqual([44, 10]);
  });

  it("counts a break between legs as still on the road", () => {
    expect(shelveTours([SUMMER], "2026-07-20").running?.tourId).toBe(44);
  });

  it("lists every run that hasn't started, soonest first", () => {
    const later = run(47, ["2027-06-01"]);
    expect(shelveTours([later, SPRING_27, FALL], "2026-12-01").upcoming.map((r) => r.tourId)).toEqual([46, 47]);
  });
});

describe("runPlace", () => {
  it("says tonight, with the show's number, when a show is today", () => {
    expect(runPlace(FALL.dates, "2026-11-19")).toEqual({ kind: "tonight", show: 6, played: 5 });
  });
  it("calls a gap of two weeks or more between legs home, until the next leg", () => {
    expect(runPlace(SUMMER.dates, "2026-07-20")).toEqual({ kind: "home", until: "2026-08-13", played: 4 });
  });
  it("calls a travel day a night off", () => {
    expect(runPlace(FALL.dates, "2026-11-07")).toEqual({ kind: "off", played: 2 });
  });
});

describe("ringArcs", () => {
  it("lights a finished run's legs as past, January at zero", () => {
    const arcs = ringArcs(SUMMER.dates, "2026-11-19", false);
    expect(arcs).toHaveLength(2);
    expect(arcs.every((a) => a.kind === "past")).toBe(true);
    expect(arcs[0].from).toBeCloseTo(yearFraction("2026-06-13"), 6);
    // A leg's arc runs through the end of its last day.
    expect(arcs[0].to).toBeCloseTo(yearFraction("2026-07-05"), 6);
  });

  it("gives an eleven-week run a longer arc than a two-week one", () => {
    const len = (dates: string[]) => ringArcs(dates, "2027-01-01", false).reduce((n, a) => n + a.to - a.from, 0);
    const summer = ["2026-06-13", "2026-06-20", "2026-06-27", "2026-07-04", "2026-07-11", "2026-07-18", "2026-07-25", "2026-08-01", "2026-08-08", "2026-08-15", "2026-08-22", "2026-08-29"];
    expect(len(summer)).toBeGreaterThan(5 * len(["2026-05-22", "2026-06-05"]));
  });

  it("splits a running leg at today: foil through today, the rest ahead", () => {
    const arcs = ringArcs(FALL.dates, "2026-11-19", true);
    const kinds = arcs.map((a) => a.kind);
    expect(kinds).toEqual(["played", "ahead"]);
    expect(arcs[0].to).toBeCloseTo(yearFraction("2026-11-20"), 6);
    expect(arcs[1].to).toBeCloseTo(yearFraction("2026-11-22"), 6);
  });

  it("draws a run that hasn't started as ahead", () => {
    expect(ringArcs(SPRING_27.dates, "2026-11-19", false).every((a) => a.kind === "ahead")).toBe(true);
  });

  it("wraps a leg over New Year's to the top of the ring", () => {
    const arcs = ringArcs(["2025-12-28", "2025-12-31", "2026-01-02"], "2026-02-01", false);
    expect(arcs).toEqual([
      { from: yearFraction("2025-12-28"), to: 1, kind: "past" },
      { from: 0, to: yearFraction("2026-01-03"), kind: "past" },
    ]);
  });
});

describe("routes and labels", () => {
  it("reads the route from the first and last known places, and counts distinct places", () => {
    expect(runRoute(["Kansas City, MO", null, "Kansas City, MO", "Rochester, NY"])).toEqual({
      first: "Kansas City",
      last: "Rochester",
      cities: 2,
    });
    expect(runRoute([null])).toEqual({ first: null, last: null, cities: 0 });
  });

  it("prints spans and weeks in the chrome voice", () => {
    expect(spanLabel("2026-11-03", "2026-11-21")).toBe("nov 3 – 21");
    expect(spanLabel("2026-06-13", "2026-09-02")).toBe("jun 13 – sep 2");
    expect(spanLabel("2014-12-20", "2014-12-20")).toBe("dec 20");
    expect(weeksOut("2026-06-13", "2026-09-02")).toBe(12);
    expect(weeksOut("2014-12-20", "2014-12-20")).toBe(1);
  });
});

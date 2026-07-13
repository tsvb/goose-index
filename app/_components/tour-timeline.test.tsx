import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TourTimeline, shortName, splitLegs } from "./tour-timeline";
import type { TourSpan } from "@/lib/queries/dimensions";

function tour(over: Partial<TourSpan> & { tourId: number; name: string; start: string; end: string }): TourSpan {
  return { shows: 1, upcoming: 0, dates: [over.start], ...over };
}

const TODAY = "2026-07-13";

describe("shortName", () => {
  it("drops what the row and the axis already say", () => {
    // The row is labelled 2026 and the chart is a chart of tours; a bar that
    // says "Summer Tour 2026" spends its width repeating its own coordinates.
    expect(shortName("Summer Tour 2026")).toBe("Summer");
    expect(shortName("Europe/UK Tour 2026")).toBe("Europe/UK");
    expect(shortName("Everything Must Go Summer Tour")).toBe("Everything Must Go Summer");
  });

  it("keeps a name that would otherwise vanish", () => {
    expect(shortName("Goosemas III")).toBe("Goosemas III");
    expect(shortName("Tour 2018")).toBe("Tour 2018"); // stripping leaves nothing
  });
});

describe("TourTimeline", () => {
  it("stacks overlapping tours into separate lanes", () => {
    // 2018 and 2024 have genuinely overlapping runs. A single-track timeline
    // draws them on top of each other and silently hides one.
    const html = renderToStaticMarkup(
      <TourTimeline
        today={TODAY}
        untouredShows={0}
        tours={[
          tour({ tourId: 1, name: "Winter Tour 2018", start: "2018-01-18", end: "2018-03-04" }),
          tour({ tourId: 2, name: "Colorado Tour 2018", start: "2018-02-08", end: "2018-02-11" }),
        ]}
      />,
    );
    const tops = [...html.matchAll(/top:(\d+)px/g)].map((m) => Number(m[1]));
    expect(new Set(tops).size).toBe(2); // two lanes, not one
  });

  it("keeps a non-overlapping year on a single lane", () => {
    const html = renderToStaticMarkup(
      <TourTimeline
        today={TODAY}
        untouredShows={0}
        tours={[
          tour({ tourId: 1, name: "Spring Tour 2023", start: "2023-03-01", end: "2023-04-01" }),
          tour({ tourId: 2, name: "Summer Tour 2023", start: "2023-06-01", end: "2023-07-01" }),
        ]}
      />,
    );
    expect(new Set([...html.matchAll(/top:(\d+)px/g)].map((m) => m[1])).size).toBe(1);
  });

  it("draws a tour that hasn't happened yet as dashed, not as a gap", () => {
    const html = renderToStaticMarkup(
      <TourTimeline
        today={TODAY}
        untouredShows={0}
        tours={[tour({ tourId: 9, name: "Fall Tour 2026", start: "2026-11-03", end: "2026-11-21", upcoming: 14 })]}
      />,
    );
    expect(html).toContain("dashed");
    expect(html).toContain("still ahead");
  });

  it("says how many shows belong to no tour instead of quietly dropping them", () => {
    // 245 shows sit under elgoose's "Not Part of a Tour" placeholder. They're
    // excluded from the bars — but that's a fact, not a gap, so it's stated.
    const html = renderToStaticMarkup(
      <TourTimeline
        today={TODAY}
        untouredShows={245}
        tours={[tour({ tourId: 1, name: "Summer Tour 2018", start: "2018-06-01", end: "2018-09-01", shows: 32 })]}
      />,
    );
    expect(html).toContain("245 shows belong to no tour");
  });

  it("marks the busiest run", () => {
    const html = renderToStaticMarkup(
      <TourTimeline
        today={TODAY}
        untouredShows={0}
        tours={[
          tour({ tourId: 1, name: "Small Tour 2019", start: "2019-01-01", end: "2019-01-10", shows: 3 }),
          tour({ tourId: 2, name: "Summer Tour 2018", start: "2018-06-01", end: "2018-09-01", shows: 32 }),
        ]}
      />,
    );
    expect(html).toContain("var(--ember)");
    expect(html).toContain("Summer Tour 2018");
  });

  it("renders nothing rather than an empty frame", () => {
    expect(renderToStaticMarkup(<TourTimeline tours={[]} untouredShows={0} today={TODAY} />)).toBe("");
  });
});

// A bar from a tour's first date to its last is an ENVELOPE, not a record.
// Summer Tour 2026 ran the east coast to Jul 4, went home for forty days, and
// picked up the west coast on Aug 13 — drawn as one bar it claims twelve solid
// weeks of touring, six of which never happened. 19 of 42 tours have a break of
// two weeks or more inside them, so this is the rule, not the edge case.
describe("splitLegs", () => {
  it("splits a tour where the band actually went home", () => {
    const legs = splitLegs([
      // east coast: shows every few days, ending Jul 4
      "2026-06-13", "2026-06-19", "2026-06-26", "2026-06-30", "2026-07-04",
      // forty days at home, then the west coast
      "2026-08-13", "2026-08-19", "2026-08-27", "2026-09-02",
    ]);
    expect(legs).toHaveLength(2);
    expect(legs[0]).toMatchObject({ start: "2026-06-13", end: "2026-07-04" });
    expect(legs[1]).toMatchObject({ start: "2026-08-13", end: "2026-09-02" });
  });

  it("does not split on ordinary travel days", () => {
    // Three nights off between cities is a tour, not two tours.
    const legs = splitLegs(["2026-06-13", "2026-06-16", "2026-06-19", "2026-06-24"]);
    expect(legs).toHaveLength(1);
    expect(legs[0].dates).toHaveLength(4);
  });

  it("splits at exactly a fortnight, and not at thirteen days", () => {
    expect(splitLegs(["2026-01-01", "2026-01-15"])).toHaveLength(2); // 14 days
    expect(splitLegs(["2026-01-01", "2026-01-14"])).toHaveLength(1); // 13 days
  });

  it("keeps every show, whatever the split", () => {
    const dates = ["2026-06-13", "2026-06-19", "2026-07-04", "2026-08-13", "2026-09-02"];
    expect(splitLegs(dates).flatMap((l) => l.dates).sort()).toEqual([...dates].sort());
  });

  it("handles a single show and no shows without throwing", () => {
    expect(splitLegs(["2026-06-13"])).toHaveLength(1);
    expect(splitLegs([])).toHaveLength(0);
  });
});

describe("TourTimeline legs", () => {
  it("joins the legs of one tour with a connector, not a solid bar", () => {
    const html = renderToStaticMarkup(
      <TourTimeline
        today="2026-07-13"
        untouredShows={0}
        tours={[
          tour({
            tourId: 44,
            name: "Summer Tour 2026",
            start: "2026-06-13",
            end: "2026-09-02",
            shows: 4,
            dates: ["2026-06-13", "2026-06-19", "2026-06-26", "2026-07-04", "2026-08-13", "2026-08-19", "2026-08-27", "2026-09-02"],
          }),
        ]}
      />,
    );
    expect(html).toContain("dotted"); // the connector
    // Two bars for one tour, both linking to the same tour.
    expect([...html.matchAll(/href="\/tours\/44"/g)]).toHaveLength(2);
  });

  it("names the tour once, on the first leg only", () => {
    const html = renderToStaticMarkup(
      <TourTimeline
        today="2026-07-13"
        untouredShows={0}
        tours={[
          tour({
            tourId: 44, name: "Summer Tour 2026", start: "2026-06-13", end: "2026-09-02", shows: 8,
            dates: ["2026-06-13", "2026-06-19", "2026-06-26", "2026-07-04", "2026-08-13", "2026-08-19", "2026-08-27", "2026-09-02"],
          }),
        ]}
      />,
    );
    // Repeating it on every leg would read as two separate tours.
    expect([...html.matchAll(/>Summer</g)]).toHaveLength(1);
  });
});

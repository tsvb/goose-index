import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TourTimeline, shortName, splitLegs, yetiLabelHide } from "./tour-timeline";
import type { TourSpan } from "@/lib/queries/dimensions";

function tour(over: Partial<TourSpan> & { tourId: number; name: string; start: string; end: string }): TourSpan {
  return { shows: 1, upcoming: 0, dates: [over.start], ...over };
}

const TODAY = "2026-07-13";

describe("shortName", () => {
  it("drops what the row and the axis already say", () => {
    // The row is labeled 2026 and the chart is a chart of tours; a bar that
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
        edition="functional"
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
        edition="functional"
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
        edition="functional"
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
        edition="functional"
        today={TODAY}
        untouredShows={245}
        tours={[tour({ tourId: 1, name: "Summer Tour 2018", start: "2018-06-01", end: "2018-09-01", shows: 32 })]}
      />,
    );
    expect(html).toContain("245 shows belong to no tour");
  });

  it("keeps every tick of a doubleheader — a repeated date must not collide as a key", () => {
    // 2022-07-22 (Newport) and 2020-02-29 are real doubleheaders: leg.dates
    // repeats the date, so a tick keyed by the date alone violates React's
    // sibling-key rule and can drop or duplicate a tick on update. SSR never
    // surfaces the collision (see instrument.test.tsx's degenerate-scale
    // note), so walk the element tree and assert sibling keys are unique.
    const doubleheader = tour({
      tourId: 9,
      name: "Dripfield Summer Tour 2022",
      start: "2022-07-20",
      end: "2022-07-24",
      shows: 3,
      dates: ["2022-07-20", "2022-07-22", "2022-07-22"],
    });
    const dups: string[] = [];
    const walk = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) {
        const keys = node
          .filter((c): c is { key: unknown } => !!c && typeof c === "object" && "key" in c)
          .map((c) => c.key)
          .filter((k): k is string => k != null)
          .map(String);
        const seen = new Set<string>();
        for (const k of keys) {
          if (seen.has(k)) dups.push(k);
          seen.add(k);
        }
        node.forEach(walk);
        return;
      }
      walk((node as { props?: { children?: unknown } }).props?.children);
    };
    walk(TourTimeline({ edition: "functional", today: TODAY, untouredShows: 0, tours: [doubleheader] }));
    expect(dups).toEqual([]);

    // and the fixture really renders all three ticks
    const html = renderToStaticMarkup(
      <TourTimeline edition="functional" today={TODAY} untouredShows={0} tours={[doubleheader]} />,
    );
    expect(html.match(/bottom-\[2px\]/g)).toHaveLength(3);
  });

  it("marks the busiest run", () => {
    const html = renderToStaticMarkup(
      <TourTimeline
        edition="functional"
        today={TODAY}
        untouredShows={0}
        tours={[
          tour({ tourId: 1, name: "Small Tour 2019", start: "2019-01-01", end: "2019-01-10", shows: 3 }),
          tour({ tourId: 2, name: "Summer Tour 2018", start: "2018-06-01", end: "2018-09-01", shows: 32 }),
        ]}
      />,
    );
    expect(html).toContain("var(--hand)");
    expect(html).toContain("Summer Tour 2018");
  });

  it("draws the non-busiest run's bar and ticks in steel, not the retired gold alias", () => {
    const html = renderToStaticMarkup(
      <TourTimeline
        edition="functional"
        today={TODAY}
        untouredShows={0}
        tours={[
          tour({ tourId: 1, name: "Small Tour 2019", start: "2019-01-01", end: "2019-01-10", shows: 3 }),
          tour({ tourId: 2, name: "Summer Tour 2018", start: "2018-06-01", end: "2018-09-01", shows: 32 }),
        ]}
      />,
    );
    // toContain("var(--steel)") alone now also passes on the label's own
    // color-mix(in srgb, var(--steel) N%, var(--ink) N%) — tighten to the
    // two specific emissions this test actually means: the leg wash and
    // the per-show ticks.
    expect(html).toMatch(/background:color-mix\(in srgb, ?var\(--steel\) 22%/); // leg wash
    expect(html).toContain("background:var(--steel)"); // ticks
    expect(html).not.toMatch(/var\(--gold/);
  });

  it("renders nothing rather than an empty frame", () => {
    expect(renderToStaticMarkup(<TourTimeline edition="functional" tours={[]} untouredShows={0} today={TODAY} />)).toBe("");
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
        edition="functional"
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
        edition="functional"
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

  it("delivers the label color via --tour-label-color, not a bare inline color: — a revert to style={{ color: nameColor }} would beat the CSS rules in globals.css (base + functional override) and silently reintroduce the 2.0 AA failure while every other test here stays green", () => {
    const html = renderToStaticMarkup(
      <TourTimeline
        edition="functional"
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
    const label = html.match(/<span class="tour-timeline-label[^>]*>Summer[^<]*<\/span>/)?.[0];
    expect(label, "label span not found").toBeTruthy();
    expect(label).toContain("tour-timeline-label");
    // The CSS custom property is set inline...
    expect(label).toMatch(/style="[^"]*--tour-label-color:[^;"]+/);
    // ...but a bare `color:` is not — that would out-specificity/out-order
    // both the base `.tour-timeline-label { color: var(--tour-label-color) }`
    // rule and functional's `[data-experience="functional"] .tour-timeline-label
    // { color: var(--ink) }` override.
    const style = label!.match(/style="([^"]*)"/)?.[1] ?? "";
    expect(style).not.toMatch(/(^|;)\s*color:/);
  });
});

describe("TourTimeline out of the tape deck (3.0)", () => {
  const tours = [
    tour({ tourId: 1, name: "Small Tour 2019", start: "2019-01-01", end: "2019-01-10", shows: 3,
      dates: ["2019-01-01", "2019-01-05", "2019-01-10"] }),
    // A show every ten days: one leg, wide enough to carry its name.
    tour({ tourId: 2, name: "Summer Tour 2018", start: "2018-06-01", end: "2018-08-30", shows: 32,
      dates: ["2018-06-01", "2018-06-11", "2018-06-21", "2018-07-01", "2018-07-11", "2018-07-21", "2018-07-31", "2018-08-10", "2018-08-20", "2018-08-30"] }),
    tour({ tourId: 3, name: "Spring Tour 2027", start: "2027-04-09", end: "2027-04-18", shows: 7 }),
  ];
  const html = renderToStaticMarkup(<TourTimeline edition="fancy" today={TODAY} untouredShows={0} tours={tours} />);

  it("draws rounded legs with a dot per show, on unboxed rows", () => {
    expect(html).toContain("rounded-full transition");
    expect(html.match(/h-\[3px\] w-\[3px\] rounded-full/g)).toHaveLength(3 + 10 + 1);
    expect(html).not.toContain("rounded-[2px]");
    expect(html).not.toContain("bg-bg-deep");
    expect(html).not.toContain("bottom-[2px]");
  });

  it("outlines the busiest run in sale and dashes the future in frost", () => {
    expect(html).toContain("border:1.5px solid var(--hand)");
    expect(html).toContain("border:1.5px dashed var(--line)");
  });

  it("labels in plain snow, the busiest run in the heat color, screen-reader only below sm", () => {
    expect(html).toMatch(/max-sm:sr-only @max-\[\d+px\]:sr-only" style="--tour-label-color:var\(--ink\)">Small</);
    expect(html).toMatch(/max-sm:sr-only @max-\[\d+px\]:sr-only" style="--tour-label-color:var\(--ember\)">Summer</);
    // Each leg is a size container, so its own rendered width decides.
    expect(html).toContain("group @container absolute");
  });

  it("hides a name only when its own leg is too narrow for it: a longer name needs a wider leg", () => {
    const px = (cls: string) => Number(cls.match(/\[(\d+)px\]/)![1]);
    expect(px(yetiLabelHide("Fall"))).toBeLessThan(px(yetiLabelHide("Summer")));
    expect(px(yetiLabelHide("Summer"))).toBeLessThan(px(yetiLabelHide("Everything Must Go Summer")));
    // "Fall" (4 characters at ~7.4px, plus 20px of margin) needs about 50px.
    expect(yetiLabelHide("Fall")).toBe("@max-[50px]:sr-only");
    // Very long names cap at the table's last step rather than throwing.
    expect(yetiLabelHide("x".repeat(80))).toBe("@max-[250px]:sr-only");
  });

  it("captions dots and the yellow outline, not ticks", () => {
    expect(html).toContain("with a dot for every show");
    expect(html).toContain("is outlined in");
    expect(html).not.toMatch(/tick/i);
  });
});

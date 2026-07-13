import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DayOfWeekDial } from "./dow-dial";
import type { DayOfWeekJamsRow } from "@/lib/queries/discoveries";

function day(dow: number, dayName: string, avgJams: number, totalShows: number): DayOfWeekJamsRow {
  return { dow, dayName, totalShows, avgJams };
}

/** Spoke stroke widths, in render order (Mon → Sun). */
function spokeWidths(html: string) {
  return [...html.matchAll(/<line [^>]*stroke="var\(--(?:ember|gold|faint)\)" stroke-width="([\d.]+)"/g)].map((m) =>
    Number(m[1]),
  );
}

// The dial invites a claim, so it has to show its evidence. Drawing a night the
// band played 25 times exactly as boldly as one they played 221 times is how a
// chart talks a reader into a conclusion the data cannot support — which is
// precisely what the old "Never miss a Sunday show?" heading did.
describe("DayOfWeekDial", () => {
  const data = [
    day(1, "Monday", 1.64, 25), // hottest, but thinnest evidence
    day(5, "Friday", 0.89, 213),
    day(6, "Saturday", 0.8, 221), // best evidenced
  ];

  it("draws a thin-evidence night with a thinner spoke than a well-evidenced one", () => {
    const widths = spokeWidths(renderToStaticMarkup(<DayOfWeekDial data={data} />));
    expect(widths).toHaveLength(3);
    const [monday, friday, saturday] = widths;
    expect(monday).toBeLessThan(friday);
    expect(friday).toBeLessThan(saturday);
  });

  it("names the hottest night but qualifies it with the sample", () => {
    const html = renderToStaticMarkup(<DayOfWeekDial data={data} />);
    expect(html).toContain("Monday");
    // The caveat is the point: the claim never travels without its evidence.
    expect(html).toContain("25 shows");
    expect(html).toContain("221");
    expect(html).toContain("thin evidence");
  });

  it("still reads deviation as length, against the week's mean", () => {
    const html = renderToStaticMarkup(<DayOfWeekDial data={data} />);
    // mean of 1.64/0.89/0.80 = 1.11 -> Monday is the only night above it
    expect(html).toContain("WEEK MEAN");
    expect(html).toContain("1.11");
    expect(html).toContain("+0.53"); // Monday's deviation
  });

  it("does not collapse when every night has the same number of shows", () => {
    const flat = [day(1, "Monday", 1.5, 50), day(2, "Tuesday", 1.0, 50)];
    const widths = spokeWidths(renderToStaticMarkup(<DayOfWeekDial data={flat} />));
    expect(widths).toHaveLength(2);
    expect(widths[0]).toBe(widths[1]);
    expect(widths[0]).toBeGreaterThan(0);
  });

  it("ignores weekdays the band has never played", () => {
    const html = renderToStaticMarkup(<DayOfWeekDial data={[day(1, "Monday", 2, 10), day(3, "Wednesday", 0, 0)]} />);
    expect(spokeWidths(html)).toHaveLength(1); // no spoke for the unplayed night
    expect(html).toContain("WED"); // but it still holds its place on the face
  });

  it("says nothing rather than dividing by zero", () => {
    expect(renderToStaticMarkup(<DayOfWeekDial data={[]} />)).toContain("No shows to read yet");
  });
});

import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TickRuler, Gauge } from "./instrument";

const majors = [
  { at: 2014, label: "2014" },
  { at: 2020, label: "2020" },
  { at: 2026, label: "2026" },
];

describe("TickRuler", () => {
  it("labels every major tick", () => {
    const html = renderToStaticMarkup(<TickRuler min={2014} max={2026} majors={majors} />);
    for (const m of majors) expect(html).toContain(m.label);
  });
  it("draws the yellow hand at the reading and names it", () => {
    const html = renderToStaticMarkup(
      <TickRuler min={2014} max={2026} majors={majors} reading={{ at: 2026, label: "now" }} />,
    );
    expect(html).toContain("text-hand");
    expect(html).toContain("now");
  });
  it("no reading, no hand", () => {
    const html = renderToStaticMarkup(<TickRuler min={2014} max={2026} majors={majors} />);
    expect(html).not.toContain("text-hand");
  });
  it("is crisp — instruments never wobble", () => {
    const html = renderToStaticMarkup(<TickRuler min={0} max={10} majors={[{ at: 0, label: "0" }]} />);
    expect(html).not.toContain("text-pencil");
  });
  it("clamps a reading outside the scale to the scale's edge", () => {
    const inRange = renderToStaticMarkup(
      <TickRuler min={0} max={100} majors={[{ at: 0, label: "0" }]} reading={{ at: 100 }} />,
    );
    const beyond = renderToStaticMarkup(
      <TickRuler min={0} max={100} majors={[{ at: 0, label: "0" }]} reading={{ at: 250 }} />,
    );
    expect(beyond).toBe(inRange);
  });
});

describe("Gauge", () => {
  it("always writes the value next to the pointer — colour never carries alone", () => {
    const html = renderToStaticMarkup(<Gauge min={0} max={100} value={74} unit="shows" />);
    expect(html).toContain("74");
    expect(html).toContain("shows");
    expect(html).toContain("text-hand");
  });
  it("degenerate scale (min === max) renders clean — no NaN coordinates, no warnings", () => {
    // Key uniqueness on degenerate scales is by construction (index keys) and
    // invisible to SSR; what CAN regress here is the x() min===max guard,
    // whose failure emits NaN-attribute warnings through console.error.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const html = renderToStaticMarkup(<Gauge min={0} max={0} value={0} unit="shows" />);
      expect(html).toContain("shows");
      expect(html).not.toContain("NaN");
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

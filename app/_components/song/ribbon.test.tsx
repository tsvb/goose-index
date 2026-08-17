import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { FactRibbon } from "./ribbon";

describe("FactRibbon", () => {
  it("renders each fact's value and key in order", () => {
    const html = renderToStaticMarkup(
      <FactRibbon
        facts={[
          { k: "times played", v: 214 },
          { k: "first played", v: "2015-06-20" },
        ]}
      />,
    );
    expect(html).toContain('class="song-ribbon"');
    // Values are content, not chart structure — they carry the ink token,
    // not steel/hand (facts rule 4: not a differentiator, just information).
    const factIdx = html.indexOf('class="song-fact"');
    expect(factIdx).toBeGreaterThan(-1);
    expect(html.indexOf(">214<")).toBeGreaterThan(factIdx);
    expect(html).toContain(">times played<");
    expect(html).toContain(">2015-06-20<");
    expect(html).toContain(">first played<");
  });

  it("renders nothing but the wrapper for an empty fact list", () => {
    const html = renderToStaticMarkup(<FactRibbon facts={[]} />);
    expect(html).toBe('<div class="song-ribbon"></div>');
  });
});

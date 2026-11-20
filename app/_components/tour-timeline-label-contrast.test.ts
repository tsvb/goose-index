import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The tour-name label in TourTimeline (tour-timeline.tsx) sits on its own
// bar's color-mix() tinted wash, not on plain --paper — a computed background
// the standing gate (globals-contrast.test.ts) can't see, because that gate
// only reads literal hex values out of the :root token blocks. This file
// extends the same reasoning to that one computed case: it reads the same
// 3.0 (fancy) and 2.0 (functional) hex tokens the stylesheet declares, and
// the color-mix() percentages themselves out of tour-timeline.tsx's actual
// ternaries (so neither the token hexes nor the component's mix recipe can
// drift out from under this test), composites the label's actual wash per
// CSS Color 4 `color-mix(in srgb, …)` semantics, and holds the result to the
// site's 4.5:1 text floor. See the nameColor comment in tour-timeline.tsx
// for the measured numbers this pins.

const CSS_PATH = path.join(__dirname, "..", "globals.css");
const COMPONENT_PATH = path.join(__dirname, "tour-timeline.tsx");

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function channelToLinear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
function relativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb;
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}
function contrastRatio(rgbA: [number, number, number], rgbB: [number, number, number]): number {
  const lA = relativeLuminance(rgbA);
  const lB = relativeLuminance(rgbB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}
// `color-mix(in srgb, fgHex p%, transparent)` composited over an opaque
// backdrop == linear interpolation of the sRGB channel bytes, weighted by p.
function washOver(fgHex: string, p: number, underHex: string): [number, number, number] {
  const fg = hexToRgb(fgHex);
  const under = hexToRgb(underHex);
  const a = p / 100;
  return fg.map((c, i) => Math.round(c * a + under[i] * (1 - a))) as [number, number, number];
}
// `color-mix(in srgb, fgHex (100-p)%, towardHex p%)`.
function mixToward(fgHex: string, p: number, towardHex: string): [number, number, number] {
  const fg = hexToRgb(fgHex);
  const toward = hexToRgb(towardHex);
  const a = p / 100;
  return fg.map((c, i) => Math.round(c * (1 - a) + toward[i] * a)) as [number, number, number];
}

function extractBlock(css: string, selectorPattern: RegExp, label: string): string {
  const match = selectorPattern.exec(css);
  if (!match) throw new Error(`tour-timeline-label-contrast: could not find ${label} in ${CSS_PATH}`);
  return match[1];
}
function extractHexTokens(blockSource: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const re = /--([a-zA-Z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blockSource))) tokens.set(m[1], m[2]);
  return tokens;
}
function requireToken(tokens: Map<string, string>, name: string, blockLabel: string): string {
  const value = tokens.get(name);
  if (!value) throw new Error(`tour-timeline-label-contrast: --${name} is not a literal hex value in ${blockLabel}`);
  return value;
}

// The leg wash is drawn by one ternary in tour-timeline.tsx:
//   background: future ? "transparent" : hot
//     ? "color-mix(in srgb, var(--hand) N%, transparent)"
//     : "color-mix(in srgb, var(--steel) N%, transparent)"
// Matched as one anchored shape (not a loose "color-mix(...steel...)" scan)
// so it can't accidentally pick up the unrelated border color-mix() a few
// lines below, which shares the same steel/transparent vocabulary.
function extractWashPercents(source: string): { hand: number; steel: number } {
  const re =
    /background:\s*future\s*\?\s*"transparent"\s*:\s*hot\s*\?\s*"color-mix\(in srgb, ?var\(--hand\) (\d+)%, ?transparent\)"\s*:\s*"color-mix\(in srgb, ?var\(--steel\) (\d+)%, ?transparent\)"/;
  const m = re.exec(source);
  if (!m) {
    throw new Error(
      `tour-timeline-label-contrast: could not find the leg-wash "background:" ternary (color-mix(in srgb, var(--hand|--steel) N%, transparent)) in ${COMPONENT_PATH} — its shape changed; update this regex to match tour-timeline.tsx's actual background ternary.`,
    );
  }
  return { hand: Number(m[1]), steel: Number(m[2]) };
}

// The label color is drawn by a second ternary, nameColor:
//   const nameColor = future ? "var(--faint)" : hot
//     ? "color-mix(in srgb, var(--ember) N%, var(--ink) N%)"
//     : "color-mix(in srgb, var(--steel) N%, var(--ink) N%)"
function extractLabelMixPercents(source: string): { ember: number; steel: number } {
  const re =
    /const nameColor = future\s*\?\s*"var\(--faint\)"\s*:\s*hot\s*\?\s*"color-mix\(in srgb, ?var\(--ember\) \d+%, ?var\(--ink\) (\d+)%\)"\s*:\s*"color-mix\(in srgb, ?var\(--steel\) \d+%, ?var\(--ink\) (\d+)%\)"/;
  const m = re.exec(source);
  if (!m) {
    throw new Error(
      `tour-timeline-label-contrast: could not find the "const nameColor" ternary (color-mix(in srgb, var(--ember|--steel) N%, var(--ink) N%)) in ${COMPONENT_PATH} — its shape changed; update this regex to match tour-timeline.tsx's actual nameColor ternary.`,
    );
  }
  return { ember: Number(m[1]), steel: Number(m[2]) };
}

let fancyTokens: Map<string, string>;
let cssSource: string;
let steelWashPct: number;
let handWashPct: number;
let steelInkPct: number;
let emberInkPct: number;

beforeAll(() => {
  cssSource = fs.readFileSync(CSS_PATH, "utf8");
  const fancyBlockSrc = extractBlock(
    cssSource,
    /:root\[data-experience=["']fancy["']\]\s*\{([^}]*)\}/,
    ':root[data-experience="fancy"] block',
  );
  fancyTokens = extractHexTokens(fancyBlockSrc);

  const componentSource = fs.readFileSync(COMPONENT_PATH, "utf8");
  const washPct = extractWashPercents(componentSource);
  const labelPct = extractLabelMixPercents(componentSource);
  steelWashPct = washPct.steel;
  handWashPct = washPct.hand;
  steelInkPct = labelPct.steel;
  emberInkPct = labelPct.ember;
});

// 3.0 declares --bg-deep as its own literal (night), the backdrop the row
// wash composites over.
function themeTokens(tokens: Map<string, string>, label: string) {
  return {
    bgDeep: requireToken(tokens, "bg-deep", label),
    steel: requireToken(tokens, "steel", label),
    ember: requireToken(tokens, "ember", label),
    ink: requireToken(tokens, "ink", label),
  };
}

describe("TourTimeline tour-name label — computed contrast on its own wash", () => {
  // The fog/slate pair this recipe was tuned for is gone (3.0 is dark only).
  // On night the plain steel label already clears AA, so the "plain steel
  // fails" case that documented the old bug no longer describes anything;
  // the mixed recipe is held to the floor instead.
  const themes = () => ({
    "3.0": themeTokens(fancyTokens, 'the :root[data-experience="fancy"] block'),
  });

  it("the default (non-hot) label — steel mixed toward ink — clears 4.5:1 on its own steel wash in 3.0", () => {
    for (const [name, t] of Object.entries(themes())) {
      const wash = washOver(t.steel, steelWashPct, t.bgDeep);
      const text = mixToward(t.steel, steelInkPct, t.ink);
      const ratio = contrastRatio(text, wash);
      expect(ratio, `${name}: steel-mixed label on its own wash`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("the hot (busiest-run) label — ember mixed toward ink — clears 4.5:1 on its own hand wash in 3.0", () => {
    // The hot bar's wash is --hand, but the label text is --ember (the
    // text role, per the mark-vs-text rule) — mirror the component.
    const hand = requireToken(fancyTokens, "hand", 'the :root[data-experience="fancy"] block');
    for (const [name, t] of Object.entries(themes())) {
      const wash = washOver(hand, handWashPct, t.bgDeep);
      const text = mixToward(t.ember, emberInkPct, t.ink);
      const ratio = contrastRatio(text, wash);
      expect(ratio, `${name}: ember-mixed label on its own wash`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

// Functional doesn't share the 3.0 mix recipe above — its gel-blue
// --steel and darkened --ember pull too far from --ink for the identical
// 70/30 mix to clear 4.5:1 on its own wash, so globals.css overrides the
// label to plain --ink for this experience instead (see the nameColor
// comment in tour-timeline.tsx and the [data-experience="functional"]
// .tour-timeline-label rule in globals.css). This block pins both halves of
// that fix: the mix recipe genuinely fails here (so the override is
// necessary, not decorative) and the override's actual color clears AA.
describe("TourTimeline tour-name label — functional edition overrides to plain --ink", () => {
  // Unlike the bare :root floor, functional's --bg-deep is its own literal
  // (`--bg-deep: #d6e6f4;` inside :root[data-experience="functional"]), not
  // an alias to --paper — so this reads --bg-deep directly rather than
  // reusing themeTokens()'s --paper substitution.
  function functionalTokens(tokens: Map<string, string>) {
    const label = 'the :root[data-experience="functional"] block';
    return {
      bgDeep: requireToken(tokens, "bg-deep", label),
      steel: requireToken(tokens, "steel", label),
      hand: requireToken(tokens, "hand", label),
      ink: requireToken(tokens, "ink", label),
    };
  }

  let functional: { bgDeep: string; steel: string; hand: string; ink: string };

  beforeAll(() => {
    const functionalBlockSrc = extractBlock(
      cssSource,
      /:root\[data-experience=["']functional["']\]\s*\{([^}]*)\}/,
      ':root[data-experience="functional"] block',
    );
    functional = functionalTokens(extractHexTokens(functionalBlockSrc));
  });

  it("the 3.0 mix recipe fails 4.5:1 with functional's own steel/ember (documents why it needs the override)", () => {
    const steelWash = washOver(functional.steel, steelWashPct, functional.bgDeep);
    const steelLabel = mixToward(functional.steel, steelInkPct, functional.ink);
    expect(contrastRatio(steelLabel, steelWash), "steel-mixed label on functional's steel wash").toBeLessThan(4.5);

    // functional's --ember equals its --hand (both #a85413), same as the
    // component mirrors for 3.0 above.
    const handWash = washOver(functional.hand, handWashPct, functional.bgDeep);
    const emberLabel = mixToward(functional.hand, emberInkPct, functional.ink);
    expect(contrastRatio(emberLabel, handWash), "ember-mixed label on functional's hand wash").toBeLessThan(4.5);
  });

  it("plain --ink on functional's own washes clears 4.5:1 — the color the CSS override now uses", () => {
    const steelWash = washOver(functional.steel, steelWashPct, functional.bgDeep);
    expect(
      contrastRatio(hexToRgb(functional.ink), steelWash),
      "ink on functional's steel wash",
    ).toBeGreaterThanOrEqual(4.5);

    const handWash = washOver(functional.hand, handWashPct, functional.bgDeep);
    expect(
      contrastRatio(hexToRgb(functional.ink), handWash),
      "ink on functional's hand wash",
    ).toBeGreaterThanOrEqual(4.5);
  });

  it("globals.css actually declares the functional override this test relies on", () => {
    expect(
      cssSource,
      "expected a `[data-experience=\"functional\"] .tour-timeline-label { color: var(--ink); }` rule in globals.css",
    ).toMatch(/\[data-experience=["']functional["']\]\s+\.tour-timeline-label\s*\{\s*color:\s*var\(--ink\)\s*;?\s*\}/);
  });
});

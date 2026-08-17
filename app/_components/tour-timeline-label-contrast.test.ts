import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The tour-name label in TourTimeline (tour-timeline.tsx) sits on its own
// bar's color-mix() tinted wash, not on plain --paper — a computed background
// the standing gate (globals-contrast.test.ts) can't see, because that gate
// only reads literal hex values out of the :root token blocks. This file
// extends the same reasoning to that one computed case: it reads the same
// :root/[data-theme="slate"] hex tokens globals-contrast.test.ts does, and
// the color-mix() percentages themselves out of tour-timeline.tsx's actual
// ternaries (so neither the token hexes nor the component's mix recipe can
// drift out from under this test), composites the label's actual wash per
// CSS Color 4 `color-mix(in srgb, …)` semantics, and holds the result to the
// site's 4.5:1 text floor. See the nameColour comment in tour-timeline.tsx
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

// The label color is drawn by a second ternary, nameColour:
//   const nameColour = future ? "var(--faint)" : hot
//     ? "color-mix(in srgb, var(--ember) N%, var(--ink) N%)"
//     : "color-mix(in srgb, var(--steel) N%, var(--ink) N%)"
function extractLabelMixPercents(source: string): { ember: number; steel: number } {
  const re =
    /const nameColour = future\s*\?\s*"var\(--faint\)"\s*:\s*hot\s*\?\s*"color-mix\(in srgb, ?var\(--ember\) \d+%, ?var\(--ink\) (\d+)%\)"\s*:\s*"color-mix\(in srgb, ?var\(--steel\) \d+%, ?var\(--ink\) (\d+)%\)"/;
  const m = re.exec(source);
  if (!m) {
    throw new Error(
      `tour-timeline-label-contrast: could not find the "const nameColour" ternary (color-mix(in srgb, var(--ember|--steel) N%, var(--ink) N%)) in ${COMPONENT_PATH} — its shape changed; update this regex to match tour-timeline.tsx's actual nameColour ternary.`,
    );
  }
  return { ember: Number(m[1]), steel: Number(m[2]) };
}

let fogTokens: Map<string, string>;
let slateTokens: Map<string, string>;
let cssSource: string;
let steelWashPct: number;
let handWashPct: number;
let steelInkPct: number;
let emberInkPct: number;

beforeAll(() => {
  cssSource = fs.readFileSync(CSS_PATH, "utf8");
  const fogBlockSrc = extractBlock(cssSource, /:root\s*\{([^}]*)\}/, 'the fog ":root { }" block');
  fogTokens = extractHexTokens(fogBlockSrc);
  const slateBlockSrc = extractBlock(
    cssSource,
    /:root\[data-theme=["']slate["']\]\s*\{([^}]*)\}/,
    ':root[data-theme="slate"] block',
  );
  slateTokens = extractHexTokens(slateBlockSrc);

  const componentSource = fs.readFileSync(COMPONENT_PATH, "utf8");
  const washPct = extractWashPercents(componentSource);
  const labelPct = extractLabelMixPercents(componentSource);
  steelWashPct = washPct.steel;
  handWashPct = washPct.hand;
  steelInkPct = labelPct.steel;
  emberInkPct = labelPct.ember;
});

// bg-deep has no literal of its own — the CSS defines it as `var(--paper)`,
// so it resolves to whichever theme's --paper is active. Same value the
// component's row wash actually composites over.
function themeTokens(tokens: Map<string, string>, label: string) {
  return {
    bgDeep: requireToken(tokens, "paper", label),
    steel: requireToken(tokens, "steel", label),
    ember: requireToken(tokens, "ember", label),
    ink: requireToken(tokens, "ink", label),
  };
}

describe("TourTimeline tour-name label — computed contrast on its own wash", () => {
  const themes = () => ({
    fog: themeTokens(fogTokens, "the fog block"),
    slate: themeTokens(slateTokens, 'the :root[data-theme="slate"] block'),
  });

  // This whole file assumes --bg-deep is a bare alias for --paper (true
  // today at globals.css:38, `--bg-deep: var(--paper);`), so themeTokens()
  // reads --paper as a stand-in for the wash's actual backdrop. If --bg-deep
  // is ever redefined to its own literal, that assumption goes stale silently
  // — the tests above would keep passing, but against the wrong backdrop.
  it("the --bg-deep alias this file relies on still resolves to var(--paper)", () => {
    expect(
      cssSource,
      "tour-timeline-label-contrast assumes `--bg-deep: var(--paper);` in globals.css so it can read --paper as the wash's backdrop; if --bg-deep now has its own literal, themeTokens() is compositing against the wrong color and every ratio below is measuring the wrong wash",
    ).toMatch(/--bg-deep:\s*var\(--paper\)\s*;/);
  });

  it("plain --steel on the unmixed steel wash fails 4.5:1 (documents the bug this fix closes)", () => {
    for (const [name, t] of Object.entries(themes())) {
      const steelWash = washOver(t.steel, steelWashPct, t.bgDeep);
      expect(contrastRatio(hexToRgb(t.steel), steelWash), `${name}: plain steel on its own unmixed wash`).toBeLessThan(4.5);
    }
  });

  it("the default (non-hot) label — steel mixed toward ink — clears 4.5:1 on its own steel wash, both themes", () => {
    for (const [name, t] of Object.entries(themes())) {
      const wash = washOver(t.steel, steelWashPct, t.bgDeep);
      const text = mixToward(t.steel, steelInkPct, t.ink);
      const ratio = contrastRatio(text, wash);
      expect(ratio, `${name}: steel-mixed label on its own wash`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("the hot (busiest-run) label — ember mixed toward ink — clears 4.5:1 on its own hand wash, both themes", () => {
    // The hot bar's wash is --hand, but the label text is --ember (the
    // text-safe amber, per the mark-vs-text rule) — mirror the component.
    const fogHand = requireToken(fogTokens, "hand", "the fog block");
    const slateHand = requireToken(slateTokens, "hand", 'the :root[data-theme="slate"] block');
    const hands = { fog: fogHand, slate: slateHand };
    for (const [name, t] of Object.entries(themes())) {
      const wash = washOver(hands[name as "fog" | "slate"], handWashPct, t.bgDeep);
      const text = mixToward(t.ember, emberInkPct, t.ink);
      const ratio = contrastRatio(text, wash);
      expect(ratio, `${name}: ember-mixed label on its own wash`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

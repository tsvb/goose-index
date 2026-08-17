import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The tour-name label in TourTimeline (tour-timeline.tsx) sits on its own
// bar's color-mix() tinted wash, not on plain --paper — a computed background
// the standing gate (globals-contrast.test.ts) can't see, because that gate
// only reads literal hex values out of the :root token blocks. This file
// extends the same reasoning to that one computed case: it reads the same
// :root/[data-theme="slate"] hex tokens globals-contrast.test.ts does (so it
// can't silently drift from the CSS source), composites the label's actual
// wash per CSS Color 4 `color-mix(in srgb, …)` semantics, and holds the
// result to the site's 4.5:1 text floor. See the nameColour comment in
// tour-timeline.tsx for the measured numbers this pins.

const CSS_PATH = path.join(__dirname, "..", "globals.css");

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

let fogTokens: Map<string, string>;
let slateTokens: Map<string, string>;

beforeAll(() => {
  const css = fs.readFileSync(CSS_PATH, "utf8");
  const fogBlockSrc = extractBlock(css, /:root\s*\{([^}]*)\}/, 'the fog ":root { }" block');
  fogTokens = extractHexTokens(fogBlockSrc);
  const slateBlockSrc = extractBlock(
    css,
    /:root\[data-theme=["']slate["']\]\s*\{([^}]*)\}/,
    ':root[data-theme="slate"] block',
  );
  slateTokens = extractHexTokens(slateBlockSrc);
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

  it("plain --steel on the unmixed 22% wash fails 4.5:1 (documents the bug this fix closes)", () => {
    for (const [name, t] of Object.entries(themes())) {
      const steelWash = washOver(t.steel, 22, t.bgDeep);
      expect(contrastRatio(hexToRgb(t.steel), steelWash), `${name}: plain steel on its own unmixed wash`).toBeLessThan(4.5);
    }
  });

  it("the default (non-hot) label — steel mixed 30% toward ink — clears 4.5:1 on its 22% steel wash, both themes", () => {
    for (const [name, t] of Object.entries(themes())) {
      const wash = washOver(t.steel, 22, t.bgDeep);
      const text = mixToward(t.steel, 30, t.ink);
      const ratio = contrastRatio(text, wash);
      expect(ratio, `${name}: steel-mixed label on its own wash`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("the hot (busiest-run) label — ember mixed 30% toward ink — clears 4.5:1 on its 30% hand wash, both themes", () => {
    // The hot bar's wash is 30% --hand, but the label text is --ember (the
    // text-safe amber, per the mark-vs-text rule) — mirror the component.
    const fogHand = requireToken(fogTokens, "hand", "the fog block");
    const slateHand = requireToken(slateTokens, "hand", 'the :root[data-theme="slate"] block');
    const hands = { fog: fogHand, slate: slateHand };
    for (const [name, t] of Object.entries(themes())) {
      const wash = washOver(hands[name as "fog" | "slate"], 30, t.bgDeep);
      const text = mixToward(t.ember, 30, t.ink);
      const ratio = contrastRatio(text, wash);
      expect(ratio, `${name}: ember-mixed label on its own wash`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

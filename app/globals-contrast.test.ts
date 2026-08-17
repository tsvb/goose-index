import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

// A standing contrast gate over app/globals.css. It reads the literal hex
// values out of the CSS source (not a browser, not computed styles) so it
// runs everywhere Vitest does and can't be fooled by JS-computed colors.
// If a future tune quietly drops a theme below AA, this fails loudly.

const CSS_PATH = path.join(__dirname, "globals.css");

// ---- WCAG 2.x relative luminance + contrast ratio ----
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (h.length !== 6) {
    throw new Error(`Unsupported hex color "${hex}" — expected 3 or 6 digits`);
  }
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function channelToLinear(c8: number): number {
  const c = c8 / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b);
}

function contrastRatio(hexA: string, hexB: string): number {
  const lA = relativeLuminance(hexA);
  const lB = relativeLuminance(hexB);
  const lighter = Math.max(lA, lB);
  const darker = Math.min(lA, lB);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---- Defensive extraction from the CSS source ----
// Finds a block by its selector and pulls out `--name: #hex;` literal pairs.
// Anything not found throws — a missing token or block is a bug, not a skip.

function extractBlock(css: string, selectorPattern: RegExp, label: string): string {
  const match = selectorPattern.exec(css);
  if (!match) {
    throw new Error(`globals-contrast: could not find ${label} in ${CSS_PATH}`);
  }
  return match[1];
}

function extractHexTokens(blockSource: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const re = /--([a-zA-Z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(blockSource))) {
    tokens.set(m[1], m[2]);
  }
  return tokens;
}

function requireToken(tokens: Map<string, string>, name: string, blockLabel: string): string {
  const value = tokens.get(name);
  if (!value) {
    throw new Error(
      `globals-contrast: --${name} is not a literal hex value in ${blockLabel} (missing, or still an alias like var(...))`,
    );
  }
  return value;
}

let css: string;
let fogTokens: Map<string, string>;
let slateTokens: Map<string, string>;
let slateMediaTokens: Map<string, string>;

beforeAll(() => {
  css = fs.readFileSync(CSS_PATH, "utf8");

  // The fog block is the first bare `:root { ... }` in the file — the base
  // color tokens declared before the dark-mode media query and the
  // `[data-theme]` overrides.
  const fogBlockSrc = extractBlock(css, /:root\s*\{([^}]*)\}/, 'the fog ":root { }" block');
  fogTokens = extractHexTokens(fogBlockSrc);

  const slateBlockSrc = extractBlock(
    css,
    /:root\[data-theme=["']slate["']\]\s*\{([^}]*)\}/,
    ':root[data-theme="slate"] block',
  );
  slateTokens = extractHexTokens(slateBlockSrc);

  const slateMediaBlockSrc = extractBlock(
    css,
    /:root:not\(\[data-theme=["']fog["']\]\)\s*\{([^}]*)\}/,
    '@media (prefers-color-scheme: dark) :root:not([data-theme="fog"]) block',
  );
  slateMediaTokens = extractHexTokens(slateMediaBlockSrc);
});

describe("contrast math self-check", () => {
  it("matches the known WCAG pair #767676 on #ffffff (~4.54:1)", () => {
    const ratio = contrastRatio("#767676", "#ffffff");
    expect(ratio).toBeGreaterThanOrEqual(4.4);
    expect(ratio).toBeLessThanOrEqual(4.6);
  });
});

// Per-theme AA thresholds. Each role keeps its meaning (see the file-header
// comment in globals.css) — this just holds it to a floor against that
// theme's paper.
const THRESHOLDS: { token: string; min: number }[] = [
  { token: "ink", min: 7.0 }, // body text, comfortably AAA
  { token: "muted", min: 4.5 },
  { token: "faint", min: 4.5 }, // styles 0.55–0.85rem text
  { token: "pencil", min: 4.5 }, // PenNote is content text
  { token: "steel", min: 4.5 }, // dates/structure text
  { token: "spruce", min: 4.5 }, // links
  { token: "hand", min: 3.0 }, // a mark, always paired with written values
  { token: "ember", min: 4.5 }, // heat/live text (.live-pill, .overdue, .song-bust)
];

describe("fog theme — token contrast against --paper", () => {
  for (const { token, min } of THRESHOLDS) {
    it(`--${token} is >= ${min}:1 on fog --paper`, () => {
      const paper = requireToken(fogTokens, "paper", "the fog block");
      const fg = requireToken(fogTokens, token, "the fog block");
      const ratio = contrastRatio(fg, paper);
      expect(ratio).toBeGreaterThanOrEqual(min);
    });
  }
});

describe("slate theme — token contrast against --paper", () => {
  for (const { token, min } of THRESHOLDS) {
    it(`--${token} is >= ${min}:1 on slate --paper`, () => {
      const paper = requireToken(slateTokens, "paper", 'the :root[data-theme="slate"] block');
      const fg = requireToken(slateTokens, token, 'the :root[data-theme="slate"] block');
      const ratio = contrastRatio(fg, paper);
      expect(ratio).toBeGreaterThanOrEqual(min);
    });
  }
});

describe("the two slate blocks stay in sync", () => {
  it("the prefers-color-scheme media block and :root[data-theme=slate] declare identical token values", () => {
    // Not literal byte-identical text — the media block carries an extra
    // rationale comment the data-theme block cross-references instead — but
    // every custom property the two declare must resolve to the same value,
    // so the dark-OS path and the explicit slate pin never disagree.
    const slateEntries = Object.fromEntries(slateTokens);
    const mediaEntries = Object.fromEntries(slateMediaTokens);
    expect(mediaEntries).toEqual(slateEntries);
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import path from "node:path";

// A standing contrast gate over app/globals.css. It reads the literal hex
// values out of the CSS source (not a browser, not computed styles) so it
// runs everywhere Vitest does and can't be fooled by JS-computed colors.
// If a future tune quietly drops 3.0 below AA, this fails loudly. (2.0 and
// 1.0 hold their own period palettes; their text pairs are pinned by the
// screenshots and the component tests, as before.)

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
let fancyTokens: Map<string, string>;
let rootSource: string;

beforeAll(() => {
  css = fs.readFileSync(CSS_PATH, "utf8");
  // The 3.0 token block is the first `:root[data-experience="fancy"] { ... }`
  // (the second one sets the type stack).
  const fancySrc = extractBlock(
    css,
    /:root\[data-experience=["']fancy["']\]\s*\{([^}]*)\}/,
    ':root[data-experience="fancy"] token block',
  );
  fancyTokens = extractHexTokens(fancySrc);
  // The floor 2.0 and 1.0 inherit: the first bare `:root { ... }`.
  rootSource = extractBlock(css, /:root\s*\{([^}]*)\}/, 'the bare ":root { }" block');
});

describe("contrast math self-check", () => {
  it("matches the known WCAG pair #767676 on #ffffff (~4.54:1)", () => {
    const ratio = contrastRatio("#767676", "#ffffff");
    expect(ratio).toBeGreaterThanOrEqual(4.4);
    expect(ratio).toBeLessThanOrEqual(4.6);
  });
});

// AA floors per role (see the role comments in globals.css). Each text role is
// held against both grounds 3.0 prints on: night (the page) and card stock
// (the pack, the date tile).
const THRESHOLDS: { token: string; min: number }[] = [
  { token: "ink", min: 7.0 }, // body text, comfortably AAA
  { token: "muted", min: 4.5 },
  { token: "faint", min: 4.5 }, // small numerals and captions
  { token: "pencil", min: 4.5 }, // the caveat channel is content text
  { token: "steel", min: 4.5 }, // dates/structure text
  { token: "spruce", min: 4.5 }, // links
  { token: "ember", min: 4.5 }, // heat as text (live, tonight, hottest night)
  { token: "foil", min: 4.5 }, // elapsed time as text (overdue counts, the Shelf's days)
  { token: "hand", min: 3.0 }, // a mark, always paired with written values
];

for (const ground of ["paper", "card-stock"] as const) {
  describe(`3.0 (Yeti) — token contrast against --${ground}`, () => {
    for (const { token, min } of THRESHOLDS) {
      it(`--${token} is >= ${min}:1 on --${ground}`, () => {
        const bg = requireToken(fancyTokens, ground, "the fancy block");
        const fg = requireToken(fancyTokens, token, "the fancy block");
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(min);
      });
    }
  });
}

describe("3.0 (Yeti) — stickers", () => {
  it("night ink on sale stock is >= 4.5:1 at every stop of the stock gradient", () => {
    const ink = requireToken(fancyTokens, "sticker-ink", "the fancy block");
    for (const stop of ["sticker-hi", "sale", "sticker-edge"]) {
      const stock = requireToken(fancyTokens, stop, "the fancy block");
      expect(contrastRatio(ink, stock), `ink on --${stop}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("3.0 is dark only", () => {
  it("no appearance switch survives: no [data-theme] selector and no prefers-color-scheme block", () => {
    expect(css).not.toMatch(/\[data-theme/);
    expect(css).not.toMatch(/prefers-color-scheme/);
  });
});

describe("2.0 and 1.0 keep what the shared charts drew before the split", () => {
  // The charts are shared by 3.0 and 2.0. --foil, --gap-near and --graphite
  // are 3.0's new roles; on the bare :root floor (what 2.0 and 1.0 inherit)
  // they must alias the tokens those surfaces drew with, or 2.0 silently
  // picks up 3.0's pink.
  it.each([
    ["foil", "ember"],
    ["gap-near", "steel"],
    ["graphite", "line"],
  ])("--%s aliases var(--%s) on the bare :root", (token, alias) => {
    expect(rootSource).toMatch(new RegExp(`--${token}:\\s*var\\(--${alias}\\)\\s*;`));
  });

  it("neither the functional nor the minimal block redeclares them", () => {
    for (const ed of ["functional", "minimal"]) {
      const block = extractBlock(
        css,
        new RegExp(`:root\\[data-experience=["']${ed}["']\\]\\s*\\{([^}]*)\\}`),
        `:root[data-experience="${ed}"] block`,
      );
      expect(block).not.toMatch(/--(foil|gap-near|graphite)\s*:/);
    }
  });
});

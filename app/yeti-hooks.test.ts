import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// 3.0 (Yeti) restyles markup it shares with 2.0 through class hooks that only
// [data-experience="fancy"] CSS reads (spec 2026-11-18, "Scoping"). The look
// lives in globals.css, so the component tests can't see it: rename a hook in
// a component and 3.0 silently loses that styling under a green suite. This
// pins the pair — every class a fancy rule selects is still emitted by some
// component's markup.

const APP = __dirname;
const css = fs.readFileSync(path.join(APP, "globals.css"), "utf8");

function tsxSources(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return tsxSources(p);
    return d.name.endsWith(".tsx") && !d.name.includes(".test.") ? [fs.readFileSync(p, "utf8")] : [];
  });
}
const markup = tsxSources(APP).join("\n");

/** Class names selected by a rule whose selector starts with the fancy scope. */
function fancyHooks(): string[] {
  const names = new Set<string>();
  for (const m of css.matchAll(/\[data-experience="fancy"\]([^{]*)\{/g)) {
    for (const c of m[1].matchAll(/\.([a-z][a-z0-9-]*[a-z0-9])(?![\w\\-])/g)) names.add(c[1]);
  }
  return [...names];
}

describe("3.0's CSS hooks are still emitted by the markup", () => {
  const hooks = fancyHooks();

  it("finds the hooks (guards the extraction itself)", () => {
    for (const h of ["pen-rule", "section-rule-title", "ledger-entry", "search-field", "mobile-sheet", "filter-link", "listen-prose", "nugs-primary"]) {
      expect(hooks).toContain(h);
    }
  });

  it.each(fancyHooks())("%s appears in some component's className", (hook) => {
    expect(markup, `globals.css styles .${hook} in 3.0, but no component emits it`).toMatch(
      new RegExp(`["'\`\\s]${hook}["'\`\\s]`),
    );
  });

  it("every Yeti material class (.yeti-*) is emitted by some component", () => {
    const material = [...new Set([...css.matchAll(/^\.(yeti-[a-z-]+)/gm)].map((m) => m[1]))];
    expect(material.length).toBeGreaterThan(5);
    for (const cls of material) {
      expect(markup, `.${cls} is styled but no component emits it`).toMatch(new RegExp(`["'\`\\s]${cls}["'\`\\s]`));
    }
  });
});

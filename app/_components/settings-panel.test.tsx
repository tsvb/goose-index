import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsPanel } from "./settings-panel";

const noop = () => {};

function render(props: Partial<React.ComponentProps<typeof SettingsPanel>> = {}) {
  return renderToStaticMarkup(<SettingsPanel current="fancy" onSelectExperience={noop} {...props} />);
}

describe("SettingsPanel", () => {
  it.each(["fancy", "functional", "minimal"] as const)("lists every edition with its label and blurb (%s)", (current) => {
    const html = render({ current });
    expect(html).toContain("3.0");
    expect(html).toContain("2.0");
    expect(html).toContain("1.0");
    expect(html).toContain("Charts, dark, rounded type");
    expect(html).toContain("Same charts, glossy skin");
    expect(html).toContain("Plain document, no charts");
  });

  it.each(["fancy", "functional", "minimal"] as const)("marks exactly the current edition as selected (%s)", (current) => {
    const html = render({ current });
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  // 3.0 is dark only: the appearance row (fog/slate/auto) is gone everywhere,
  // and so is 2.0/1.0's hint that it "applies in the 3.0 experience".
  it.each(["fancy", "functional", "minimal"] as const)("offers no appearance switch (%s)", (current) => {
    const html = render({ current });
    expect(html).not.toContain("appearance");
    expect(html).not.toMatch(/\bfog\b|\bslate\b|aria-pressed/);
  });

  it("draws 3.0's picker as Yeti's segmented control: one group, three segments, the thumb on the current one", () => {
    const html = render({ current: "fancy" });
    expect(html).toContain('role="group" aria-label="edition"');
    expect(html.match(/<button/g)).toHaveLength(3);
    expect(html).toContain("bg-[var(--segment-thumb)]");
    expect(html.match(/bg-\[var\(--segment-thumb\)\]/g)).toHaveLength(1);
  });

  it("keeps 2.0 and 1.0 on their ruled list (no Yeti sheet)", () => {
    for (const current of ["functional", "minimal"] as const) {
      const html = render({ current });
      expect(html).toContain("border-y");
      expect(html).not.toContain("settings-yeti");
      expect(html).not.toContain("segment-thumb");
    }
  });

  it("leaves the edition options enabled when not pending", () => {
    const html = render();
    // `disabled:opacity-60` is always present; assert on the attribute the pending state adds.
    expect(html).not.toContain('disabled=""');
  });

  it.each(["fancy", "functional"] as const)("disables every edition option while a switch is pending (%s)", (current) => {
    const html = render({ current, pending: true });
    expect(html.match(/disabled=""/g)).toHaveLength(3);
    expect(html).toContain("disabled:opacity-60");
  });
});

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsPanel, resolveTheme } from "./settings-panel";

const noop = () => {};

function render(props: Partial<React.ComponentProps<typeof SettingsPanel>> = {}) {
  return renderToStaticMarkup(
    <SettingsPanel
      current="fancy"
      themeAllowed
      theme="auto"
      onSelectExperience={noop}
      onSelectTheme={noop}
      {...props}
    />,
  );
}

describe("SettingsPanel", () => {
  it("lists every experience with its label and blurb", () => {
    const html = render();
    expect(html).toContain("3.0");
    expect(html).toContain("2.0");
    expect(html).toContain("1.0");
    expect(html).toContain("Charts, pen &amp; instrument"); // React escapes & in rendered markup
    expect(html).toContain("Same charts, glossy skin");
    expect(html).toContain("Plain document, no charts");
  });

  it("marks exactly the current experience as selected", () => {
    const html = render({ current: "functional" });
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    // Selection means steel everywhere in the panel — never gold.
    expect(html).toContain("text-steel");
    expect(html).not.toMatch(/bg-gold|text-gold/);
  });

  it("shows the appearance section with every theme when theme is allowed", () => {
    const html = render({ current: "fancy", themeAllowed: true });
    expect(html).toContain("appearance");
    expect(html).toContain("auto");
    expect(html).toContain("fog");
    expect(html).toContain("slate");
  });

  it("marks exactly one appearance option as pressed", () => {
    const html = render({ themeAllowed: true, theme: "fog" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(html).toContain("text-steel");
  });

  // No pills, no icons, no grid: appearance is a plain row of underlined
  // lowercase text options — one per theme, three of them.
  it("lays the themes out as a plain text row, one option per theme", () => {
    const html = render({ themeAllowed: true });
    expect(html).toContain("flex gap-4");
    const buttons = html.match(/aria-pressed="(true|false)"/g) ?? [];
    expect(buttons.length).toBe(3); // auto, fog, slate
    expect(html).toContain("lowercase");
  });

  it("marks fog as pressed when it is the active theme", () => {
    const html = render({ themeAllowed: true, theme: "fog" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("marks slate as pressed when it is the active theme", () => {
    const html = render({ themeAllowed: true, theme: "slate" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("hides appearance and shows a hint when theme is not allowed", () => {
    const html = render({ current: "functional", themeAllowed: false });
    expect(html).not.toContain('aria-label="appearance"');
    expect(html).toContain("appearance applies in the 3.0 experience.");
  });

  it("leaves the experience options enabled when not pending", () => {
    const html = render();
    // The `disabled:opacity-60` class is always present; assert on the actual
    // disabled attribute, which only the pending state adds.
    expect(html).not.toContain('disabled=""');
  });

  it("disables and dims every experience option while an experience switch is pending", () => {
    const html = render({ pending: true });
    expect(html.match(/disabled=""/g)).toHaveLength(3); // the three experiences
    expect(html).toContain("disabled:opacity-60");
  });

  // A ruled sheet, not a floating card: no rounded corners, no drop shadow.
  it("renders the panel as a ruled sheet, not a floating card", () => {
    const html = render();
    expect(html).toContain("border-y");
    expect(html).not.toContain("rounded-xl");
    expect(html).not.toContain("shadow");
  });
});

describe("resolveTheme", () => {
  it("accepts each valid theme and rejects everything else", () => {
    expect(resolveTheme("auto")).toBe("auto");
    expect(resolveTheme("fog")).toBe("fog");
    expect(resolveTheme("slate")).toBe("slate");
    expect(resolveTheme("xl2")).toBeNull();
    expect(resolveTheme("sepia")).toBeNull();
    expect(resolveTheme("")).toBeNull();
    expect(resolveTheme(null)).toBeNull();
    expect(resolveTheme(undefined)).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsPanel, resolveTheme } from "./settings-panel";

const noop = () => {};

function render(props: Partial<React.ComponentProps<typeof SettingsPanel>> = {}) {
  return renderToStaticMarkup(
    <SettingsPanel
      current="fancy"
      themeAllowed
      theme="dark"
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
    expect(html).toContain("The full immersive edition");
    expect(html).toContain("Dense, utility-first");
    expect(html).toContain("Plain, fast, machine-readable");
  });

  it("marks exactly the current experience as selected", () => {
    const html = render({ current: "functional" });
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it("shows the Appearance section with every theme when theme is allowed", () => {
    const html = render({ current: "fancy", themeAllowed: true });
    expect(html).toContain("Appearance");
    expect(html).toContain("Dark");
    expect(html).toContain("Light");
    expect(html).toContain("Pod");
    expect(html).toContain("XL II");
  });

  it("marks exactly one appearance option as pressed", () => {
    const html = render({ themeAllowed: true, theme: "light" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("marks pod as pressed when it is the active theme", () => {
    const html = render({ themeAllowed: true, theme: "pod" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("marks xl2 as pressed when it is the active theme", () => {
    const html = render({ themeAllowed: true, theme: "xl2" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("hides Appearance and shows a hint when theme is not allowed", () => {
    const html = render({ current: "functional", themeAllowed: false });
    expect(html).not.toContain("Appearance");
    expect(html).toContain("3.0 experience");
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
});

describe("resolveTheme", () => {
  it("accepts each valid theme and rejects everything else", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("pod")).toBe("pod");
    expect(resolveTheme("xl2")).toBe("xl2");
    expect(resolveTheme("sepia")).toBeNull();
    expect(resolveTheme("")).toBeNull();
    expect(resolveTheme(null)).toBeNull();
    expect(resolveTheme(undefined)).toBeNull();
  });
});

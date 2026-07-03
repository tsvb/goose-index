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

  it("shows the Appearance section with dark/light/pod when theme is allowed", () => {
    const html = render({ current: "fancy", themeAllowed: true });
    expect(html).toContain("Appearance");
    expect(html).toContain("Dark");
    expect(html).toContain("Light");
    expect(html).toContain("Pod");
  });

  it("marks exactly one appearance option as pressed", () => {
    const html = render({ themeAllowed: true, theme: "light" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("marks pod as pressed when it is the active theme", () => {
    const html = render({ themeAllowed: true, theme: "pod" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("hides Appearance and shows a hint when theme is not allowed", () => {
    const html = render({ current: "functional", themeAllowed: false });
    expect(html).not.toContain("Appearance");
    expect(html).toContain("3.0 experience");
  });
});

describe("resolveTheme", () => {
  it("accepts each valid theme and rejects everything else", () => {
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("pod")).toBe("pod");
    expect(resolveTheme("sepia")).toBeNull();
    expect(resolveTheme("")).toBeNull();
    expect(resolveTheme(null)).toBeNull();
    expect(resolveTheme(undefined)).toBeNull();
  });
});

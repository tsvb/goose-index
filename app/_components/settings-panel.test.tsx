import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsPanel } from "./settings-panel";

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
    expect(html).toContain("Fancy");
    expect(html).toContain("Functional");
    expect(html).toContain("Minimal");
    expect(html).toContain("The full immersive edition");
    expect(html).toContain("Dense, utility-first");
    expect(html).toContain("Plain, fast, machine-readable");
  });

  it("marks exactly the current experience as selected", () => {
    const html = render({ current: "functional" });
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
  });

  it("shows the Appearance section with dark/light when theme is allowed", () => {
    const html = render({ current: "fancy", themeAllowed: true });
    expect(html).toContain("Appearance");
    expect(html).toContain("Dark");
    expect(html).toContain("Light");
  });

  it("marks exactly one appearance option as pressed", () => {
    const html = render({ themeAllowed: true, theme: "light" });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1);
  });

  it("hides Appearance and shows a hint when theme is not allowed", () => {
    const html = render({ current: "functional", themeAllowed: false });
    expect(html).not.toContain("Appearance");
    expect(html).toContain("Fancy experience");
  });
});

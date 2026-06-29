import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsMenu } from "./settings-menu";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
}));

describe("SettingsMenu trigger", () => {
  it("renders a labelled icon trigger in fancy", () => {
    const html = renderToStaticMarkup(<SettingsMenu current="fancy" />);
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain("<svg");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('aria-expanded="false"');
  });

  it("renders an icon trigger in functional", () => {
    const html = renderToStaticMarkup(<SettingsMenu current="functional" />);
    expect(html).toContain("<svg");
  });

  it("renders a plain text trigger with no svg in minimal", () => {
    const html = renderToStaticMarkup(<SettingsMenu current="minimal" />);
    expect(html).toContain("Settings");
    expect(html).not.toContain("<svg");
  });

  it("keeps the panel closed on initial render", () => {
    const html = renderToStaticMarkup(<SettingsMenu current="fancy" />);
    expect(html).not.toContain('role="dialog"');
  });
});

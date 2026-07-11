import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SettingsMenu, initialFocusTarget } from "./settings-menu";

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

describe("initialFocusTarget — where focus lands when the popover opens", () => {
  // Stand-in for panelRef.current.querySelector (node tests run without a DOM):
  // maps each selector to what the panel would return.
  const panelWith = (bySelector: Record<string, string | null>) => (sel: string) =>
    bySelector[sel] ?? null;

  it("prefers the currently-selected experience option", () => {
    const query = panelWith({
      'button[aria-current="true"]': "selected-option",
      button: "first-option",
    });
    expect(initialFocusTarget(query)).toBe("selected-option");
  });

  it("falls back to the first button when nothing is marked current", () => {
    const query = panelWith({ button: "first-option" });
    expect(initialFocusTarget(query)).toBe("first-option");
  });

  it("returns null for a panel with no buttons", () => {
    expect(initialFocusTarget(panelWith({}))).toBe(null);
  });
});

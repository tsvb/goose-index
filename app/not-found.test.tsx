import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({ experience: "fancy" as string }));

vi.mock("@/lib/experience.server", () => ({ getExperience: async () => h.experience }));

import NotFound from "./not-found";

async function render() {
  return renderToStaticMarkup(await NotFound());
}

beforeEach(() => {
  h.experience = "fancy";
});

describe("NotFound experience branching", () => {
  it("renders the de-carded kicker + prose for the default (fancy) experience, no stage-glow card", async () => {
    const html = await render();
    expect(html).toContain("off the setlist");
    expect(html).toContain("This page isn’t in the index.");
    expect(html).not.toContain("stage-glow");
    expect(html).toContain('href="/shows"');
  });

  it("shares the same de-carded markup in functional mode", async () => {
    h.experience = "functional";
    const html = await render();
    // Functional shares the fancy markup and only recolors via tokens.
    expect(html).toContain("off the setlist");
    expect(html).not.toContain("stage-glow");
  });

  it("renders a plain Doc in minimal mode, with no fancy hero leaking in", async () => {
    h.experience = "minimal";
    const html = await render();
    expect(html).toContain("doc-crumb"); // breadcrumb
    expect(html).toContain("This page isn’t in the index");
    expect(html).toContain('href="/shows"');
    expect(html).toContain('href="/songs"');
    expect(html).not.toContain("stage-glow");
    expect(html).not.toContain("off the setlist");
  });
});

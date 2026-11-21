import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({ edition: undefined as string | undefined }));

vi.mock("next/navigation", () => ({ useParams: () => ({ experience: h.edition }) }));
vi.mock("@vercel/analytics/next", () => ({ Analytics: () => null }));
vi.mock("@vercel/speed-insights/next", () => ({ SpeedInsights: () => null }));
vi.mock("@/app/_components/site-header", () => ({ SiteHeader: () => null }));
vi.mock("@/app/_components/site-footer", () => ({ SiteFooter: () => null }));
vi.mock("@/app/globals.css", () => ({}));

import NotFound from "./not-found";

beforeEach(() => {
  h.edition = undefined;
});

describe("root NotFound", () => {
  it("wraps the 404 in the default (fancy) edition with no edition in the URL", async () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('data-experience="fancy"');
    expect(html).toContain("off the setlist");
  });

  it("follows the edition in the URL", async () => {
    h.edition = "minimal";
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain('data-experience="minimal"');
    expect(html).toContain("doc-crumb");
    expect(html).not.toContain("off the setlist");
  });
});

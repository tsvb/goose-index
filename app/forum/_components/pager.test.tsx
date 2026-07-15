import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Pager } from "./pager";

const href = (p: number) => `/x?page=${p}`;

describe("Pager", () => {
  it("renders nothing for a single page", () => {
    expect(renderToStaticMarkup(<Pager current={1} total={1} href={href} />)).toBe("");
  });
  it("windows around the current page with first/last and gaps", () => {
    const html = renderToStaticMarkup(<Pager current={10} total={20} href={href} />);
    for (const p of [1, 8, 9, 10, 11, 12, 20]) expect(html).toContain(`/x?page=${p}`);
    expect(html).not.toContain(`/x?page=5"`);
    expect(html).toContain("…");
    expect(html).toContain('aria-current="page"');
  });
});

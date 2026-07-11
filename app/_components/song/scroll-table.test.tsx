import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ScrollTable } from "./scroll-table";

describe("ScrollTable", () => {
  it("renders children inside the horizontal scroller", () => {
    const html = renderToStaticMarkup(<ScrollTable><table className="song-table" /></ScrollTable>);
    expect(html).toContain("song-scroll-inner");
    expect(html).toContain("song-table");
  });

  it("withholds the swipe hint and edge fade until overflow is measured on the client", () => {
    const html = renderToStaticMarkup(<ScrollTable swipeHint="swipe → for more stats"><table /></ScrollTable>);
    expect(html).not.toContain("song-scroll-hint");
    expect(html).not.toContain("song-scroll-fade");
  });
});

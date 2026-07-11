import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SkeletonBar, SkeletonPage, SkeletonHeader, SkeletonRows, SkeletonPills } from "./skeleton";
import ShowsLoading from "../shows/loading";
import ShowLoading from "../shows/[date]/loading";
import SongsLoading from "../songs/loading";
import SongLoading from "../songs/[slug]/loading";
import StatsLoading from "../stats/loading";
import SearchLoading from "../search/loading";

describe("skeleton primitives", () => {
  it("bars shimmer, go still under reduced motion, and are hidden from AT", () => {
    const html = renderToStaticMarkup(<SkeletonBar className="h-3 w-16" />);
    expect(html).toContain("animate-pulse");
    expect(html).toContain("motion-reduce:animate-none");
    expect(html).toContain("bg-line-soft");
    expect(html).toContain("aria-hidden");
  });
  it("page wrapper announces a loading status to AT", () => {
    const html = renderToStaticMarkup(<SkeletonPage label="Loading shows">x</SkeletonPage>);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Loading shows…");
    expect(html).toContain("sr-only");
  });
  it("header echoes the hero band", () => {
    const html = renderToStaticMarkup(<SkeletonHeader />);
    expect(html).toContain("border-b");
  });
  it("rows are hairline-separated inside a surface card", () => {
    const html = renderToStaticMarkup(<SkeletonRows rows={3} />);
    expect(html).toContain("surface-card");
    expect(html.match(/border-t border-line-soft/g)).toHaveLength(2); // n-1 hairlines
  });
  it("pills render the requested count of rounded ghosts", () => {
    const html = renderToStaticMarkup(<SkeletonPills count={4} />);
    expect(html.match(/rounded-full/g)).toHaveLength(4);
  });
});

describe("route loading skeletons", () => {
  const routes: [string, () => React.ReactElement][] = [
    ["shows", ShowsLoading],
    ["shows/[date]", ShowLoading],
    ["songs", SongsLoading],
    ["songs/[slug]", SongLoading],
    ["stats", StatsLoading],
    ["search", SearchLoading],
  ];
  for (const [name, Loading] of routes) {
    it(`${name} renders a status wrapper full of shimmering bars`, () => {
      const html = renderToStaticMarkup(<Loading />);
      expect(html).toContain('role="status"');
      expect(html).toContain("animate-pulse");
      expect(html).toContain("motion-reduce:animate-none");
      // Experience-neutral: nothing mode-specific baked in.
      expect(html).not.toContain("w2-");
      expect(html).not.toContain("stage-glow");
    });
  }
});

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Breadcrumb, MetaTable, ShowTable, EntityTable } from "./doc";
import type { ShowSummary } from "@/lib/queries/shows";

const shows: ShowSummary[] = [
  { showId: 1, date: "2025-06-28", order: null, venue: "MSG", city: "New York", state: "NY", country: "USA", tour: null, tourId: null, songCount: 12, hasNotes: false },
];

describe("doc primitives", () => {
  it("Breadcrumb renders links and a trailing label with separators", () => {
    const html = renderToStaticMarkup(<Breadcrumb trail={[{ href: "/", label: "Goose Index" }, { label: "Shows" }]} />);
    expect(html).toContain("Goose Index");
    expect(html).toContain("›");
    expect(html).toContain("Shows");
  });
  it("ShowTable renders a table row linking to the show", () => {
    const html = renderToStaticMarkup(<ShowTable shows={shows} />);
    expect(html).toContain("<table");
    expect(html).toContain("2025-06-28");
    expect(html).toContain("MSG");
    expect(html).toContain("/shows/2025-06-28");
  });
  it("MetaTable renders k/v rows", () => {
    const html = renderToStaticMarkup(<MetaTable rows={[{ k: "Songs", v: 12 }]} />);
    expect(html).toContain("Songs");
    expect(html).toContain("12");
  });
  it("EntityTable links each row", () => {
    const html = renderToStaticMarkup(<EntityTable rows={[{ href: "/venues/9", name: "MSG", count: 5 }]} />);
    expect(html).toContain("/venues/9");
    expect(html).toContain("MSG");
  });
});

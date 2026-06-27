import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ShowList } from "./show-list";
import type { ShowSummary } from "@/lib/queries/shows";

const rows: ShowSummary[] = [
  { showId: 1, date: "2025-06-28", order: null, venue: "MSG", city: "New York", state: "NY", country: "USA", tour: null, tourId: null, songCount: 12, hasNotes: false },
];

describe("ShowList", () => {
  it("minimal renders a plain list with a date-and-venue link", () => {
    const html = renderToStaticMarkup(<ShowList rows={rows} experience="minimal" />);
    expect(html).toContain("<ul");
    expect(html).toContain("2025-06-28");
    expect(html).toContain("MSG");
    expect(html).not.toContain("surface-card"); // not the ledger card
  });
  it("fancy renders the ledger card list", () => {
    const html = renderToStaticMarkup(<ShowList rows={rows} experience="fancy" />);
    expect(html).toContain("surface-card");
  });
});

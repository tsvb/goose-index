import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ThreadTable } from "./thread-list";
import type { ThreadRow } from "@/lib/queries/forum";

const rows: ThreadRow[] = [
  { id: 1, slug: "pinned", title: "Pinned one", author: "Tim", replyCount: 3, pinned: true, locked: false, lastPostAuthor: "Tim", lastPostAt: "2026-07-15 01:00", unread: false },
  { id: 2, slug: "fresh", title: "Fresh one", author: "Ana", replyCount: 0, pinned: false, locked: true, lastPostAuthor: "Ana", lastPostAt: "2026-07-15 02:00", unread: true },
];

describe("ThreadTable", () => {
  it("minimal renders a list with pins, locks, unread bolding and links", () => {
    const html = renderToStaticMarkup(<ThreadTable rows={rows} experience="minimal" />);
    expect(html).toContain("📌");
    expect(html).toContain("🔒");
    expect(html).toContain('href="/forum/threads/1-pinned"');
    expect(html).toContain("font-bold"); // unread thread
    expect(html).toContain("?page=unread");
  });
  it("fancy renders card rows; empty state stands alone", () => {
    expect(renderToStaticMarkup(<ThreadTable rows={rows} experience="fancy" />)).toContain("surface-card");
    expect(renderToStaticMarkup(<ThreadTable rows={[]} experience="fancy" />)).toContain("No threads yet");
  });
});

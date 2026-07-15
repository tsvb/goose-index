import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BoardIndex } from "./board-index";
import type { BoardIndexCategory } from "@/lib/queries/forum";

const categories: BoardIndexCategory[] = [{
  id: 1, title: "The Music", boards: [{
    id: 1, slug: "tour-talk", title: "Tour Talk", description: "The road.",
    threadCount: 4, postCount: 20,
    lastPost: { threadId: 9, threadSlug: "msg-n2", threadTitle: "MSG N2", author: "Tim", at: "2026-07-15 01:00" },
  }, {
    id: 2, slug: "off-topic", title: "Off Topic", description: "Etc.", threadCount: 0, postCount: 0, lastPost: null,
  }],
}];

describe("BoardIndex", () => {
  it("minimal renders plain lists with board links", () => {
    const html = renderToStaticMarkup(<BoardIndex categories={categories} experience="minimal" />);
    expect(html).toContain('href="/forum/tour-talk"');
    expect(html).toContain("4 threads");
    expect(html).toContain('href="/forum/threads/9-msg-n2"');
    expect(html).not.toContain("surface-card");
  });
  it("fancy renders card sections; empty boards say so", () => {
    const html = renderToStaticMarkup(<BoardIndex categories={categories} experience="fancy" />);
    expect(html).toContain("surface-card");
    expect(html).toContain("No posts yet");
  });
});

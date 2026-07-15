import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PostCard } from "./post-card";
import type { PostView } from "@/lib/queries/forum";

const post: PostView = {
  id: 7, authorId: 1, author: "Tim", authorPostCount: 42, authorJoined: "2026-07-01",
  authorSignature: null, body: "hello [b]world[/b]", deleted: false, at: "2026-07-15 01:00", editedAt: null,
};

describe("PostCard", () => {
  it("renders the body as BBCode with an anchor and author block", () => {
    const html = renderToStaticMarkup(<PostCard post={post} experience="fancy" />);
    expect(html).toContain('id="post-7"');
    expect(html).toContain("<strong>world</strong>");
    expect(html).toContain("42 posts");
    expect(html).toContain('href="/forum/members/Tim"');
  });
  it("shows the edited marker", () => {
    const html = renderToStaticMarkup(<PostCard post={{ ...post, editedAt: "2026-07-15 02:00" }} experience="functional" />);
    expect(html).toContain("edited 2026-07-15 02:00");
  });
  it("tombstones hide the body", () => {
    const html = renderToStaticMarkup(<PostCard post={{ ...post, deleted: true, body: null }} experience="minimal" />);
    expect(html).toContain("Removed by a moderator");
    expect(html).not.toContain("world");
  });
  it("admins see the preserved body under the tombstone note", () => {
    const html = renderToStaticMarkup(<PostCard post={{ ...post, deleted: true }} experience="fancy" />);
    expect(html).toContain("Removed by a moderator");
    expect(html).toContain("<strong>world</strong>");
  });
});

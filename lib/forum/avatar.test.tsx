import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar } from "./avatar";

const visual = (html: string) => html.replace(/aria-label="[^"]*"/, ""); // compare pixels + color, ignore label

describe("Avatar", () => {
  it("is visually deterministic for a username, case-insensitively", () => {
    const a = renderToStaticMarkup(<Avatar username="HonkFan" />);
    const b = renderToStaticMarkup(<Avatar username="honkfan" />);
    expect(visual(a)).toBe(visual(b)); // same pixels + color regardless of case
    expect(a).toContain('aria-label="HonkFan avatar"'); // label keeps display case
    expect(a).toContain("<svg");
  });
  it("differs between usernames", () => {
    expect(visual(renderToStaticMarkup(<Avatar username="alpha" />)))
      .not.toBe(visual(renderToStaticMarkup(<Avatar username="omega" />)));
  });
});

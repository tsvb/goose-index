import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Avatar } from "./avatar";

describe("Avatar", () => {
  it("is deterministic for a username, case-insensitively", () => {
    const a = renderToStaticMarkup(<Avatar username="HonkFan" />);
    expect(renderToStaticMarkup(<Avatar username="honkfan" />)).toBe(a);
    expect(a).toContain("<svg");
    expect(a).toContain('aria-label="honkfan avatar"'); // label normalized to lowercase for determinism
  });
  it("differs between usernames", () => {
    expect(renderToStaticMarkup(<Avatar username="alpha" />))
      .not.toBe(renderToStaticMarkup(<Avatar username="omega" />));
  });
});

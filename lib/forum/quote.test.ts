import { describe, it, expect } from "vitest";
import { quoteBBCode } from "./quote";

describe("quoteBBCode", () => {
  it("wraps the body with attribution", () => {
    expect(quoteBBCode("Tim", "honk")).toBe("[quote=Tim]honk[/quote]\n");
  });
  it("strips nested quotes, even stacked ones", () => {
    expect(quoteBBCode("Tim", "[quote=Ana]old[/quote]\nfresh take")).toBe("[quote=Tim]fresh take[/quote]\n");
    expect(quoteBBCode("Tim", "[quote=A][quote=B]x[/quote]y[/quote]z")).toBe("[quote=Tim]z[/quote]\n");
  });
  it("keeps sibling (non-nested) quoted-around text", () => {
    // two sibling quote blocks with real text between/after them
    expect(quoteBBCode("Tim", "[quote=A]a[/quote] middle [quote=B]b[/quote] tail"))
      .toBe("[quote=Tim]middle  tail[/quote]\n");
  });
  it("handles an unclosed quote tag without hanging or over-stripping", () => {
    // unclosed tag doesn't match innermost regex, so it survives in output
    const out = quoteBBCode("Tim", "[quote=A]unterminated then real words");
    expect(out).toBe("[quote=Tim][quote=A]unterminated then real words[/quote]\n");
    expect(out).toContain("real words"); // trailing real text survives
  });
  it("strips triple nesting to the outermost non-quoted text", () => {
    expect(quoteBBCode("Tim", "[quote=A][quote=B][quote=C]deep[/quote]mid[/quote]outer[/quote]keep"))
      .toBe("[quote=Tim]keep[/quote]\n");
  });
});

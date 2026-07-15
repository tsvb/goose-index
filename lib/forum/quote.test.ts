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
});

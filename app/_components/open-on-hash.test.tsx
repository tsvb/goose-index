import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { OpenOnHash } from "./open-on-hash";

describe("OpenOnHash", () => {
  it("renders nothing on the server", () => {
    expect(renderToStaticMarkup(<OpenOnHash />)).toBe("");
  });
});

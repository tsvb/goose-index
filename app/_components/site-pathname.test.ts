import { describe, it, expect } from "vitest";
import { stripEdition } from "./site-pathname";

describe("stripEdition", () => {
  it("drops the edition prefix middleware adds", () => {
    expect(stripEdition("/edition/fancy/songs/hot-tea")).toBe("/songs/hot-tea");
    expect(stripEdition("/edition/minimal")).toBe("/");
  });
  it("leaves public paths alone", () => {
    expect(stripEdition("/songs")).toBe("/songs");
    expect(stripEdition("/")).toBe("/");
    expect(stripEdition("/editions-of-the-band")).toBe("/editions-of-the-band");
  });
});

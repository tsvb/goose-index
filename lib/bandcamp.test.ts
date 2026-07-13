import { describe, it, expect } from "vitest";
import { isBandcampUrl, bandcampHref, BANDCAMP_HOME } from "./bandcamp";

// This is a security control, not a formatting helper. Every Bandcamp URL on the
// site comes from a scrape — data we don't control — so a poisoned scrape must
// not be able to plant an arbitrary outbound link on a page fans trust.
describe("isBandcampUrl", () => {
  it("accepts the band's releases", () => {
    expect(isBandcampUrl("https://goosetheband.bandcamp.com/album/dripfield")).toBe(true);
    expect(isBandcampUrl(BANDCAMP_HOME + "/album/big-modern")).toBe(true);
  });

  it("rejects a lookalike host", () => {
    // The whole reason for endsWith(".bandcamp.com") rather than includes().
    expect(isBandcampUrl("https://bandcamp.com.evil.test/album/x")).toBe(false);
    expect(isBandcampUrl("https://notbandcamp.com/album/x")).toBe(false);
    expect(isBandcampUrl("https://evil.test/?x=bandcamp.com")).toBe(false);
  });

  it("rejects anything that isn't https", () => {
    expect(isBandcampUrl("http://goosetheband.bandcamp.com/album/x")).toBe(false);
    expect(isBandcampUrl("javascript:alert(1)")).toBe(false);
    expect(isBandcampUrl("data:text/html,<script>")).toBe(false);
  });

  it("rejects junk without throwing", () => {
    expect(isBandcampUrl(null)).toBe(false);
    expect(isBandcampUrl(undefined)).toBe(false);
    expect(isBandcampUrl("")).toBe(false);
    expect(isBandcampUrl("not a url")).toBe(false);
  });
});

describe("bandcampHref", () => {
  it("passes a good url through and drops a bad one", () => {
    expect(bandcampHref("https://goosetheband.bandcamp.com/album/x")).toBe(
      "https://goosetheband.bandcamp.com/album/x",
    );
    expect(bandcampHref("https://evil.test/x")).toBeNull();
    expect(bandcampHref(null)).toBeNull();
  });
});

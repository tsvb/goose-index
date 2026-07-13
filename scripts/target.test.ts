import { describe, it, expect, vi, afterEach } from "vitest";
import { announceTarget } from "./target";

afterEach(() => vi.restoreAllMocks());

// A handoff doc claimed local runs couldn't reach production. They can — .env
// points at Neon. Nothing was lost finding that out, because the writes involved
// happened to be additive, but "local can't reach prod" is the belief that loses
// a database. No script should depend on a doc, or on memory, to know where its
// writes land.
describe("announceTarget", () => {
  it("recognises Neon as production", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { isProd } = announceTarget("postgres://u:p@ep-rough-morning.us-east-1.aws.neon.tech/neondb");
    expect(isProd).toBe(true);
    expect(log.mock.calls.flat().join(" ")).toContain("PRODUCTION");
  });

  it("does not cry wolf about a local database", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const { isProd, host } = announceTarget("postgres://postgres:postgres@localhost:5432/goose");
    expect(isProd).toBe(false);
    expect(host).toBe("localhost");
    expect(log.mock.calls.flat().join(" ")).not.toContain("PRODUCTION");
  });

  it("never prints the credentials it was handed", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    announceTarget("postgres://admin:hunter2@ep-x.neon.tech/neondb?sslmode=require");
    const printed = log.mock.calls.flat().join(" ");
    expect(printed).not.toContain("hunter2");
    expect(printed).not.toContain("admin");
  });

  it("doesn't throw on a malformed URL — the connect will fail loudly enough", () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    expect(() => announceTarget("not-a-url")).not.toThrow();
    expect(announceTarget("not-a-url").isProd).toBe(false);
  });
});

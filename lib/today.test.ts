import { describe, it, expect, afterEach, vi } from "vitest";
import { etToday, etYear } from "./today";

const at = (iso: string) => new Date(iso);

describe("etToday", () => {
  it("is the ET calendar date, not the UTC one", () => {
    // 9:50pm ET — UTC is already the next day, which is exactly what Postgres
    // `current_date` answered in production.
    expect(etToday(at("2026-08-18T01:50:00Z"))).toBe("2026-08-17");
    expect(etToday(at("2026-08-18T03:59:00Z"))).toBe("2026-08-17");
    expect(etToday(at("2026-08-18T04:00:00Z"))).toBe("2026-08-18"); // midnight ET
  });

  it("holds through the EST offset in winter", () => {
    expect(etToday(at("2026-01-15T04:59:00Z"))).toBe("2026-01-14"); // 11:59pm EST
    expect(etToday(at("2026-01-15T05:00:00Z"))).toBe("2026-01-15");
  });

  it("reads the system clock when given no instant", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(at("2026-12-31T23:00:00Z"));
    expect(etToday()).toBe("2026-12-31"); // 6pm ET, still the old year
  });
});

describe("etYear", () => {
  it("follows the ET date across New Year's Eve", () => {
    expect(etYear(at("2027-01-01T04:59:00Z"))).toBe(2026); // 11:59pm EST Dec 31
    expect(etYear(at("2027-01-01T05:00:00Z"))).toBe(2027);
  });
});

afterEach(() => vi.useRealTimers());

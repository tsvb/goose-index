import { describe, it, expect } from "vitest";
import { normalizeDateQuery } from "./search-dates";

describe("normalizeDateQuery", () => {
  it("passes ISO dates through (padding if needed)", () => {
    expect(normalizeDateQuery("2024-08-07")).toEqual({ iso: "2024-08-07" });
    expect(normalizeDateQuery("2024-8-7")).toEqual({ iso: "2024-08-07" });
    expect(normalizeDateQuery("  2024-08-07  ")).toEqual({ iso: "2024-08-07" });
  });

  it("normalizes US numeric M/D/YYYY with / or - separators", () => {
    expect(normalizeDateQuery("8/7/2024")).toEqual({ iso: "2024-08-07" });
    expect(normalizeDateQuery("08/07/2024")).toEqual({ iso: "2024-08-07" });
    expect(normalizeDateQuery("8-7-2024")).toEqual({ iso: "2024-08-07" });
    expect(normalizeDateQuery("12/31/2024")).toEqual({ iso: "2024-12-31" });
    expect(normalizeDateQuery("6/25/2025")).toEqual({ iso: "2025-06-25" });
  });

  it("rejects mixed numeric separators and 2-digit years", () => {
    expect(normalizeDateQuery("8/7-2024")).toBeNull();
    expect(normalizeDateQuery("8-7/2024")).toBeNull();
    expect(normalizeDateQuery("8/7/24")).toBeNull();
  });

  it("normalizes month-name dates, case-insensitively", () => {
    expect(normalizeDateQuery("aug 7 2024")).toEqual({ iso: "2024-08-07" });
    expect(normalizeDateQuery("august 7, 2024")).toEqual({ iso: "2024-08-07" });
    expect(normalizeDateQuery("Aug 7th 2024")).toEqual({ iso: "2024-08-07" });
    expect(normalizeDateQuery("AUGUST 7 2024")).toEqual({ iso: "2024-08-07" });
    expect(normalizeDateQuery("may 1st 2022")).toEqual({ iso: "2022-05-01" });
    expect(normalizeDateQuery("June 22nd, 2024")).toEqual({ iso: "2024-06-22" });
    expect(normalizeDateQuery("march 3rd 2023")).toEqual({ iso: "2023-03-03" });
    expect(normalizeDateQuery("sept 5 2023")).toEqual({ iso: "2023-09-05" });
    expect(normalizeDateQuery("dec. 31 2021")).toEqual({ iso: "2021-12-31" });
  });

  it("rejects words that are not month names", () => {
    expect(normalizeDateQuery("junk 7 2024")).toBeNull();
    expect(normalizeDateQuery("ma 7 2024")).toBeNull(); // ambiguous 2-char prefix
    expect(normalizeDateQuery("smarch 13 2024")).toBeNull();
  });

  it("normalizes month + day with no year to MM-DD", () => {
    expect(normalizeDateQuery("july 10")).toEqual({ monthDay: "07-10" });
    expect(normalizeDateQuery("jul 10")).toEqual({ monthDay: "07-10" });
    expect(normalizeDateQuery("Jul 10th")).toEqual({ monthDay: "07-10" });
    expect(normalizeDateQuery("7/10")).toEqual({ monthDay: "07-10" });
    expect(normalizeDateQuery("12/31")).toEqual({ monthDay: "12-31" });
    expect(normalizeDateQuery("feb 29")).toEqual({ monthDay: "02-29" }); // leap-year shows exist
  });

  it("rejects impossible calendar dates", () => {
    expect(normalizeDateQuery("2024-02-30")).toBeNull();
    expect(normalizeDateQuery("2024-13-01")).toBeNull();
    expect(normalizeDateQuery("13/7/2024")).toBeNull();
    expect(normalizeDateQuery("2/29/2023")).toBeNull(); // not a leap year
    expect(normalizeDateQuery("2/29/2024")).toEqual({ iso: "2024-02-29" }); // leap year
    expect(normalizeDateQuery("aug 32 2024")).toBeNull();
    expect(normalizeDateQuery("feb 30")).toBeNull();
    expect(normalizeDateQuery("13/10")).toBeNull();
    expect(normalizeDateQuery("0/10")).toBeNull();
    expect(normalizeDateQuery("7/0")).toBeNull();
    expect(normalizeDateQuery("0001-01-01")).toBeNull(); // below any plausible show year
  });

  it("returns null for everything that is not a date", () => {
    expect(normalizeDateQuery("")).toBeNull();
    expect(normalizeDateQuery("   ")).toBeNull();
    expect(normalizeDateQuery("red rocks")).toBeNull();
    expect(normalizeDateQuery("jive ii")).toBeNull();
    expect(normalizeDateQuery("2024")).toBeNull(); // bare year stays a text search
    expect(normalizeDateQuery("2020-01")).toBeNull(); // year-month prefix stays a text search
    expect(normalizeDateQuery("june")).toBeNull(); // bare month
    expect(normalizeDateQuery("may 2024")).toBeNull(); // month + year, no day
    expect(normalizeDateQuery("10")).toBeNull();
    expect(normalizeDateQuery("port chester")).toBeNull();
  });
});

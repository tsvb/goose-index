/**
 * Turn the date shapes fans actually type into something SQL can match.
 *
 * A full date ("2024-08-07", "8/7/2024", "aug 7 2024") normalizes to
 * `{ iso: "2024-08-07" }` for an exact show_date match. A month + day with
 * no year ("july 10", "7/10") normalizes to `{ monthDay: "07-10" }` for an
 * across-years to_char(show_date, 'MM-DD') match. Anything else returns
 * null so callers fall back to plain substring search.
 */

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

// Feb is 29 here: year-less forms ("feb 29") should match leap-year shows.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** "jul", "july", "sept" → month number; anything that isn't a ≥3-char month-name prefix → null. */
function monthFromName(name: string): number | null {
  if (name.length < 3) return null;
  const idx = MONTH_NAMES.findIndex((full) => full.startsWith(name));
  return idx === -1 ? null : idx + 1;
}

function isValidDay(month: number, day: number, year?: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  if (year !== undefined && month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return day <= (leap ? 29 : 28);
  }
  return day <= DAYS_IN_MONTH[month - 1];
}

// Years below 1000 can't be show dates (and year 0 isn't even a valid Postgres date).
function toIso(year: number, month: number, day: number): { iso: string } | null {
  if (year < 1000 || !isValidDay(month, day, year)) return null;
  return { iso: `${year}-${pad2(month)}-${pad2(day)}` };
}

export function normalizeDateQuery(q: string): { iso?: string; monthDay?: string } | null {
  const s = q.trim().toLowerCase();
  if (!s) return null;

  // Already ISO: "2024-08-07" (unpadded "2024-8-7" tolerated).
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]));

  // US numeric: "8/7/2024", "08/07/2024", "8-7-2024" (separator must be consistent).
  m = /^(\d{1,2})([/-])(\d{1,2})\2(\d{4})$/.exec(s);
  if (m) return toIso(Number(m[4]), Number(m[1]), Number(m[3]));

  // Month name + day + year: "aug 7 2024", "august 7, 2024", "Aug 7th 2024".
  m = /^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,\s*|\s+)(\d{4})$/.exec(s);
  if (m) {
    const month = monthFromName(m[1]);
    return month == null ? null : toIso(Number(m[3]), month, Number(m[2]));
  }

  // Month name + day, no year: "july 10", "jul 10th" → recurring date.
  m = /^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?$/.exec(s);
  if (m) {
    const month = monthFromName(m[1]);
    const day = Number(m[2]);
    if (month == null || !isValidDay(month, day)) return null;
    return { monthDay: `${pad2(month)}-${pad2(day)}` };
  }

  // Numeric month/day, no year: "7/10".
  m = /^(\d{1,2})\/(\d{1,2})$/.exec(s);
  if (m) {
    const month = Number(m[1]);
    const day = Number(m[2]);
    return isValidDay(month, day) ? { monthDay: `${pad2(month)}-${pad2(day)}` } : null;
  }

  return null;
}

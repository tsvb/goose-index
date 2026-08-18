/** Pure parsing of nugs's `catalog.containersAll` payload. No network, no db.
 *  Probed 2026-08-18: the endpoint answers unauthenticated and returns
 *  `{ Response: { containers: [...] } }`. */

export type NugsContainer = {
  containerId: number;
  performanceDate: string;   // "YYYY-MM-DD"
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
  hasVideo: boolean;
};

/** The API formats dates as "2026/08/16". Returns null for anything that isn't
 *  three slash-separated numeric parts — real rows do carry empty dates. Also
 *  range-checks month/day: an out-of-range value (e.g. "2026/13/45") would
 *  otherwise reach the `date` column and abort the whole nightly transaction
 *  at insert, letting one garbage row poison the batch. */
export function toISODate(s: unknown): string | null {
  if (typeof s !== "string") return null;
  const m = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const [, y, mo, d] = m;
  const moNum = Number(mo), dNum = Number(d);
  if (moNum < 1 || moNum > 12 || dNum < 1 || dNum > 31) return null;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

const str = (v: unknown): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
};

export function parseContainers(json: unknown, opts: { hasVideo?: boolean } = {}): NugsContainer[] {
  const containers = (json as { Response?: { containers?: unknown } } | null)
    ?.Response?.containers;
  if (!Array.isArray(containers)) return [];

  const out: NugsContainer[] = [];
  for (const raw of containers) {
    if (raw === null || typeof raw !== "object") continue;
    const c = raw as Record<string, unknown>;
    const containerId = typeof c.containerID === "number" ? c.containerID : null;
    const performanceDate = toISODate(c.performanceDateFormatted);
    if (containerId == null || performanceDate == null) continue;
    out.push({
      containerId,
      performanceDate,
      venueName: str(c.venueName),
      venueCity: str(c.venueCity),
      venueState: str(c.venueState),
      hasVideo: opts.hasVideo === true,
    });
  }
  return out;
}

/** How many container rows the payload actually carried, before any of them were
 *  dropped for being unparseable. Paging must terminate on THIS count: real rows
 *  carry empty dates, so a full page can parse short, and breaking on the parsed
 *  count would silently truncate the catalog. */
export function rawContainerCount(json: unknown): number {
  const containers = (json as { Response?: { containers?: unknown } } | null)
    ?.Response?.containers;
  return Array.isArray(containers) ? containers.length : 0;
}

export interface CheckResult { name: string; pass: boolean; detail: string }

const floor = (name: string, actual: number, min: number): CheckResult => ({
  name, pass: actual >= min, detail: `${actual} (min ${min})`,
});

export function checkFloors(c: { shows: number; songs: number; venues: number; performances: number }): CheckResult[] {
  return [
    floor("shows floor", c.shows, 800),
    floor("songs floor", c.songs, 600),
    floor("venues floor", c.venues, 580),
    floor("performances floor", c.performances, 6000),
  ];
}

const zero = (name: string, n: number): CheckResult => ({ name, pass: n === 0, detail: `${n} offenders` });

export function checkIntegrity(o: {
  perfNoShow: number; perfNoSong: number; showNoVenue: number; dupPositions: number;
}): CheckResult[] {
  return [
    zero("performances reference a show", o.perfNoShow),
    zero("performances reference a song", o.perfNoSong),
    zero("shows reference a venue", o.showNoVenue),
    zero("no duplicate (show,set,position)", o.dupPositions),
  ];
}

export function checkSpotShow(input: { performanceCount: number; notes: string | null }): CheckResult {
  const pass = input.performanceCount === 15 && (input.notes ?? "").toLowerCase().includes("acoustic");
  return { name: "spot-check 2022-06-24 Radio City", pass,
    detail: `${input.performanceCount} performances; notes=${JSON.stringify(input.notes)}` };
}

export function checkEarliestShow(earliest: string | null): CheckResult {
  return { name: "earliest show is 2014-09-27", pass: earliest === "2014-09-27",
    detail: `earliest=${earliest}` };
}

/**
 * `is_jam` is elgoose's own column. The sync mirrors it faithfully and the site
 * reads it nowhere: it is 0 on all 9,595 setlist rows the API serves, across
 * every artist, so "this performance was a jam" means `is_jamchart` alone.
 *
 * Every jam figure on the site rests on that upstream fact, which makes it
 * worth checking rather than assuming. If the curators ever start filling the
 * field in, this fails loudly in the nightly run and the one-flag definition
 * needs revisiting — better than silently dropping jams nobody notices are
 * missing.
 */
export function checkDeadJamFlag(flagged: number): CheckResult {
  return {
    name: "is_jam still unused upstream (site reads is_jamchart alone)",
    pass: flagged === 0,
    detail: `${flagged} performances flagged is_jam`,
  };
}

export function summarize(results: CheckResult[]): { ok: boolean; results: CheckResult[] } {
  return { ok: results.every((r) => r.pass), results };
}

import { trackSeconds, formatDuration } from "@/lib/queries/format";
import type { SetlistEntry } from "@/lib/queries/shows";
import { isSegue } from "./shared";

/** The set, drawn as the strip of tape it actually is.
 *
 * A show is a duration, and duration's native form is length. The setlist gives
 * you every song's runtime as a number in a column, which means the *shape* of
 * the night — that Creatures ate a third of the set, that the encore is three
 * short ones and a monster — is invisible until you read twenty-four figures and
 * do arithmetic. Here it's the first thing you see.
 *
 * Two things the tape says that the list cannot:
 *   · a jam is *long*, and you can see how long against everything around it
 *   · a segue is unbroken tape, so a segued run is one continuous block
 *
 * Songs with no logged time are drawn as narrow hatched slivers rather than
 * quietly dropped — the tape has to admit what it doesn't know, or its
 * proportions are a lie.
 */

/** Untimed songs get a fixed sliver. Wide enough to see, too narrow to be
 * mistaken for a real duration. */
const UNKNOWN_WEIGHT = 0.012;
/** Minute grid, so a segment can be read as a length and not just a bar. */
const TICK_SECONDS = 300;

export function SetTape({ entries }: { entries: SetlistEntry[] }) {
  const timed = entries.map((e) => trackSeconds(e.trackTime));
  const known = timed.filter((s): s is number => s != null);
  // With too little timing data the proportions say more about what's missing
  // than about the music. Say nothing rather than something misleading.
  if (known.length < Math.ceil(entries.length / 2)) return null;

  const total = known.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  const unknownCount = entries.length - known.length;
  const ticks = Math.floor(total / TICK_SECONDS);

  return (
    <figure className="mb-4 mt-1">
      <div className="flex h-9 w-full overflow-hidden rounded-[2px] border border-line bg-bg-deep" aria-hidden="true">
        {entries.map((e, i) => {
          const secs = timed[i];
          const prev = entries[i - 1];
          // A segue is unbroken tape: butt this segment against the last one.
          const joined = prev ? isSegue(prev.transition) : false;
          const weight = secs != null ? secs / total : UNKNOWN_WEIGHT;
          const hot = e.isJamchart || e.isJam;

          return (
            <span
              key={e.uniqueId}
              title={`${e.song}${e.trackTime ? ` — ${e.trackTime}` : " — no time logged"}`}
              style={{
                flexGrow: weight,
                flexBasis: 0,
                // A segued run is one unbroken length of tape — but four songs
                // butted together with no seam read as a single slab, and the
                // tape stops being countable exactly where the music gets
                // interesting. So: joined, with a splice mark. Not a gap.
                ...(joined ? { borderLeft: "1px solid var(--bg-deep)" } : {}),
              }}
              className={[
                "block h-full min-w-[2px] transition-opacity",
                joined ? "" : "ml-[3px] first:ml-0",
                secs == null
                  ? "bg-[repeating-linear-gradient(135deg,var(--line)_0_2px,transparent_2px_5px)]"
                  : hot
                    ? "bg-ember opacity-90 hover:opacity-100"
                    : "bg-gold opacity-55 hover:opacity-85",
              ].join(" ")}
            />
          );
        })}
      </div>

      {/* Counter: the minute grid the segments are read against. */}
      <div className="relative mt-1 h-3" aria-hidden="true">
        {Array.from({ length: ticks + 1 }, (_, t) => {
          const at = (t * TICK_SECONDS) / total;
          return (
            <span
              key={t}
              className="absolute top-0 h-1 w-px bg-line"
              style={{ left: `${at * 100}%` }}
            />
          );
        })}
        <span className="absolute left-0 top-1.5 font-mono text-[0.58rem] leading-none text-faint">0:00</span>
        <span className="absolute right-0 top-1.5 font-mono text-[0.58rem] leading-none text-faint">
          {formatDuration(total)}
        </span>
      </div>

      <figcaption className="mt-2 font-mono text-[0.6rem] leading-relaxed text-faint">
        The set as tape — each song is as wide as it is long, segued songs run on unbroken tape (split by a splice, not
        a gap), and <span className="text-ember">jams</span> burn.
        {unknownCount > 0 && (
          <>
            {" "}
            {unknownCount} {unknownCount === 1 ? "song has" : "songs have"} no logged time, shown hatched.
          </>
        )}
      </figcaption>
    </figure>
  );
}

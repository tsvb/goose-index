import { trackSeconds, formatDuration } from "@/lib/queries/format";
import type { SetlistEntry } from "@/lib/queries/shows";
import { isSegue } from "./shared";

/** The set, drawn as a length (3.0 only: the fancy setlist is its one caller).
 *
 * A show is a duration, and duration's native form is length. The setlist gives
 * you every song's runtime as a number in a column, which means the *shape* of
 * the night — that Creatures ate a third of the set, that the encore is three
 * short ones and a monster — is invisible until you read twenty-four figures and
 * do arithmetic. Here it's the first thing you see.
 *
 * Two things the strip says that the list cannot:
 *   · a jam is *long*, and you can see how long against everything around it
 *   · a segued run is one piece, so the songs the band ran together stay together
 *
 * It was first drawn as tape with a minute ruler under it; Yeti (round 2, spec
 * 2026-11-18) keeps the length and drops the tape: rounded pieces in a well,
 * a small gap between songs played separately, and only the two ends labeled.
 *
 * Songs with no logged time are drawn as narrow hollow slivers rather than
 * quietly dropped — the strip has to admit what it doesn't know, or its
 * proportions are a lie.
 */

/** Untimed songs get a fixed sliver. Wide enough to see, too narrow to be
 * mistaken for a real duration. */
const UNKNOWN_WEIGHT = 0.012;

/** `explain` prints the one-time reading key (what width, joins and yellow
 * mean). The show page passes it for the first strip only — the key is the
 * same for every set, and three copies read as boilerplate. The per-set
 * "n songs have no logged time" note is evidence about *this* strip and stays. */
export function SetTape({ entries, explain = false }: { entries: SetlistEntry[]; explain?: boolean }) {
  const timed = entries.map((e) => trackSeconds(e.trackTime));
  const known = timed.filter((s): s is number => s != null);
  // With too little timing data the proportions say more about what's missing
  // than about the music. Say nothing rather than something misleading.
  if (known.length < Math.ceil(entries.length / 2)) return null;

  const total = known.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  const unknownCount = entries.length - known.length;

  return (
    <figure className="set-tape mb-4 mt-1">
      {/* .set-tape-strip is a stable styling hook; nothing reskins it today. */}
      <div
        className="set-tape-strip flex h-9 w-full overflow-hidden rounded-[12px] bg-[var(--well)] p-1 shadow-[inset_0_0_0_1px_var(--frost)]"
        aria-hidden="true"
      >
        {entries.map((e, i) => {
          const secs = timed[i];
          const prev = entries[i - 1];
          // A segued run is one piece: butt this song against the last one.
          const joined = prev ? isSegue(prev.transition) : false;
          const joinsNext = i < entries.length - 1 && isSegue(e.transition);
          const weight = secs != null ? secs / total : UNKNOWN_WEIGHT;
          const hot = e.isJamchart;

          return (
            <span
              key={e.uniqueId}
              title={`${e.song}${e.trackTime ? ` — ${e.trackTime}` : " — no time logged"}`}
              style={{
                flexGrow: weight,
                flexBasis: 0,
                // Joined, but still countable: four songs fused with no seam read
                // as a single slab, so each join keeps a hairline of the well.
                ...(joined ? { borderLeft: "1px solid var(--bg-deep)" } : {}),
              }}
              className={[
                "block h-full min-w-[3px] rounded-[7px] transition-opacity",
                joined ? "rounded-l-none" : "ml-[3px] first:ml-0",
                joinsNext ? "rounded-r-none" : "",
                secs == null
                  ? "bg-transparent shadow-[inset_0_0_0_1px_var(--frost)]"
                  : hot
                    ? "bg-ember opacity-95 hover:opacity-100"
                    : "bg-steel opacity-60 hover:opacity-85",
              ].join(" ")}
            />
          );
        })}
      </div>

      {/* The two ends: the strip is read as a share of the set, not against a ruler. */}
      <div className="mt-1.5 flex justify-between font-mono text-[0.58rem] leading-none text-faint" aria-hidden="true">
        <span>0:00</span>
        <span>{formatDuration(total)}</span>
      </div>

      {(explain || unknownCount > 0) && (
        <figcaption className="mt-2 font-mono text-[0.6rem] leading-relaxed text-faint">
          {explain && (
            <>
              Each song is as wide as it is long. Segued songs run together as one piece, and{" "}
              <span className="text-ember">jams</span> are yellow.
            </>
          )}
          {unknownCount > 0 && (
            <>
              {explain ? " " : ""}
              {unknownCount} {unknownCount === 1 ? "song has" : "songs have"} no logged time, shown hollow.
            </>
          )}
        </figcaption>
      )}
    </figure>
  );
}

import Link from "next/link";
import { formatShortDate, showHref } from "@/lib/queries/format";
import type { CoachsNoteRow } from "@/lib/queries/discoveries";
import { isBandcampUrl } from "@/lib/bandcamp";
import { chromeLink } from "@/app/_components/page-chrome";
import { DateTile } from "@/app/_components/yeti";
import { linerLines, type LinerLine } from "@/lib/liner-notes";
import type { Experience } from "@/lib/experience";

/** The coach's notes, on the paper they belong on.
 *
 * These were a terminal window — traffic-light dots, a .txt filename — which
 * said "a developer made this" and nothing whatever about a band. They're liner
 * notes: they ship inside the shell, printed on the J-card. So that's what they
 * get — a spine down the left with the date, and the inlay panel beside it. */
/** 3.0 (Yeti, round 2): the notes printed on card stock, the material Yeti
 * prints a record on. The J-card's spine and ruled insert were the tape
 * theme's; here the show's date tile stands upright beside the notes, and the
 * notes are laid out — not changed — as a "says so on the box" list: each
 * `Label: value` line a row on a frost hairline, the numbered notes as
 * footnotes, blank lines gone. `linerLines` keeps every word, in order. */
function LinerLineView({ line, afterNotes }: { line: LinerLine; afterNotes: boolean }) {
  // A row or line that follows the footnotes needs air above its hairline, or
  // the rule sits on the last note and reads as its underline.
  const gap = afterNotes ? " mt-2" : "";
  switch (line.kind) {
    case "row":
      return (
        <p className={`grid grid-cols-[6rem_minmax(0,1fr)] gap-3 border-t border-line py-2 text-[0.9rem]${gap}`}>
          <span className="font-extrabold lowercase text-muted">{line.label}</span>
          <span className="min-w-0 text-ink">{line.value}</span>
        </p>
      );
    case "head":
      return <p className="mb-1 mt-3 text-[0.8rem] font-extrabold lowercase text-muted">{line.text}</p>;
    case "note":
      return (
        <p className="text-[0.9rem] text-ink">
          <span className="tabular-nums text-faint">[{line.mark}]</span> {line.text}
        </p>
      );
    default:
      return <p className={`border-t border-line py-2 text-[0.9rem] text-ink${gap}`}>{line.text}</p>;
  }
}

function LinerCard({ note }: { note: CoachsNoteRow }) {
  const lines = linerLines(note.coachNotes);
  const place = lines[0]?.kind === "place" ? lines[0].text : note.venueName;
  const body = lines[0]?.kind === "place" ? lines.slice(1) : lines;
  return (
    <article className="coach-card grid gap-4 rounded-[22px] bg-[var(--card-stock)] p-5 shadow-[inset_0_0_0_1px_var(--frost),0_18px_30px_-22px_rgba(0,0,0,0.8)] sm:grid-cols-[72px_minmax(0,1fr)] sm:gap-5">
      <DateTile iso={note.showDate} className="yeti-tile-sm w-[72px]" />
      <div className="min-w-0">
        <header className="mb-2.5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-[1.1rem] font-black text-ink">
              <Link href={showHref(note.showDate, note.showOrder)} className="underline-offset-4 hover:underline">
                {formatShortDate(note.showDate)}
              </Link>
            </h3>
            {place && <p className="text-[0.85rem] text-muted">{place}</p>}
          </div>
          {note.bandcampUrl && isBandcampUrl(note.bandcampUrl) && (
            <a
              href={note.bandcampUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-full bg-[rgba(233,238,247,0.04)] px-3.5 py-1.5 text-[0.85rem] font-extrabold text-ink shadow-[inset_0_0_0_1px_var(--frost)] transition hover:shadow-[inset_0_0_0_1px_var(--slush)]"
            >
              listen ↗
            </a>
          )}
        </header>
        {body.map((line, i) => (
          <LinerLineView key={i} line={line} afterNotes={body[i - 1]?.kind === "note"} />
        ))}
      </div>
    </article>
  );
}

export function CoachsNotes({ data, edition }: { data: CoachsNoteRow[]; edition: Experience }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No coach&apos;s notes archived yet.</p>;
  }
  if (edition === "fancy") {
    return (
      <div className="space-y-5">
        {data.map((note) => (
          <LinerCard key={note.showId} note={note} />
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {data.map((note) => (
        <article key={note.showId} className="flex border border-line bg-surface">
          {/* The spine — the edge you read when the tape is shelved. */}
          <div className="flex shrink-0 items-center justify-center border-r border-line bg-surface-2 px-2 py-3">
            <span
              className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-faint"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {note.showDate}
            </span>
          </div>

          <div className="min-w-0 flex-1 p-4 sm:p-5">
            <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line-soft pb-2">
              <h3 className="font-display text-base text-ink">
                <Link href={showHref(note.showDate, note.showOrder)} className="underline-offset-4 hover:underline">
                  {formatShortDate(note.showDate)}
                </Link>
              </h3>
              {note.venueName && (
                <p className="min-w-0 truncate font-mono text-xs text-muted">{note.venueName}</p>
              )}
              {note.bandcampUrl && isBandcampUrl(note.bandcampUrl) && (
                <a
                  href={note.bandcampUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.2em] ${chromeLink}`}
                >
                  Listen ↗
                </a>
              )}
            </header>

            {/* The write-on label: ruled, the way the insert actually is. */}
            <p
              className="mt-3 whitespace-pre-wrap font-mono text-[0.82rem] leading-[1.7rem] text-muted"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(to bottom, transparent 0 calc(1.7rem - 1px), var(--line-soft) calc(1.7rem - 1px) 1.7rem)",
              }}
            >
              {note.coachNotes}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}


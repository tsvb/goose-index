import Link from "next/link";
import { formatShortDate, showHref } from "@/lib/queries/format";
import type { CoachsNoteRow } from "@/lib/queries/discoveries";
import { isBandcampUrl } from "@/lib/bandcamp";

/** The coach's notes, on the paper they belong on.
 *
 * These were a terminal window — traffic-light dots, a .txt filename — which
 * said "a developer made this" and nothing whatever about a band. They're liner
 * notes: they ship inside the shell, printed on the J-card. So that's what they
 * get — a spine down the left with the date, and the inlay panel beside it. */
export function CoachsNotes({ data }: { data: CoachsNoteRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No coach&apos;s notes archived yet.</p>;
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
                <Link href={showHref(note.showDate, note.showOrder)} className="hover:text-gold">
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
                  className="shrink-0 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-gold hover:text-gold-soft"
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


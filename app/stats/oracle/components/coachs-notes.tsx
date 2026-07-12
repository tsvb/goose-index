import { formatShortDate } from "@/lib/queries/format";
import { showHref } from "@/lib/queries/format";
import type { CoachsNoteRow } from "@/lib/queries/discoveries";

/** Terminal-styled cards for the coach's notes. Uses theme tokens so the
 * "screen" reskins with the rest of the design system (fancy dark, light,
 * pod, functional, minimal) rather than baking in raw hex. */
export function CoachsNotes({ data }: { data: CoachsNoteRow[] }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No coach's notes archived yet.</p>;
  }
  return (
    <div className="space-y-6">
      {data.map((note) => {
        const fileName = `coach_notes_${note.showDate.replace(/-/g, "")}.txt`;
        return (
          <article
            key={note.showId}
            className="overflow-hidden rounded-lg border border-line bg-bg-deep"
          >
            <header className="flex items-center justify-between gap-3 border-b border-line-soft bg-surface-2 px-4 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-ember/50" />
                  <span className="h-2.5 w-2.5 rounded-full bg-gold/50" />
                  <span className="h-2.5 w-2.5 rounded-full bg-sage/50" />
                </span>
                <span className="ml-1 truncate font-mono text-[0.68rem] uppercase tracking-widest text-faint">
                  {fileName}
                </span>
              </div>
              {note.bandcampUrl && isBandcampUrl(note.bandcampUrl) && (
                <a
                  href={note.bandcampUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 font-mono text-[0.68rem] uppercase tracking-widest text-gold hover:text-gold-soft"
                >
                  [Listen]&nbsp;↗
                </a>
              )}
            </header>
            <div className="p-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-lg text-ink">
                  <a href={showHref(note.showDate)} className="hover:text-gold">
                    {formatShortDate(note.showDate)}
                  </a>
                </h3>
                {note.venueName && (
                  <p className="font-mono text-xs text-muted">@ {note.venueName}</p>
                )}
              </div>
              <p className="whitespace-pre-wrap border-l-2 border-gold/40 pl-4 font-mono text-sm leading-relaxed text-muted">
                {note.coachNotes}
              </p>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/** Guard against a compromised scrape planting arbitrary outbound links. */
function isBandcampUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname.endsWith(".bandcamp.com");
  } catch {
    return false;
  }
}

import Link from "next/link";
import { formatShortDate, showHref } from "@/lib/queries/format";
import type { CoachsNoteRow } from "@/lib/queries/discoveries";
import { isBandcampUrl } from "@/lib/bandcamp";
import { chromeLink } from "@/app/_components/page-chrome";
import { Fragment } from "react";
import { DateTile, PlainTag } from "@/app/_components/yeti";
import { linerCard, type LinerSet, type SetPiece } from "@/lib/liner-notes";
import type { Experience } from "@/lib/experience";

/** The coach's notes, on the paper they belong on.
 *
 * These were a terminal window — traffic-light dots, a .txt filename — which
 * said "a developer made this" and nothing whatever about a band. They're liner
 * notes: they ship inside the shell, printed on the J-card. So that's what they
 * get — a spine down the left with the date, and the inlay panel beside it. */
/** 3.0 (Yeti, round 4): the coach's notes are the band's margin notes, and
 * Yeti prints a fact as a plain tag on the thing it describes. So each numbered
 * note moves onto the song its mark sits on — "Can't Get You Out Of My Head"
 * `Kylie Minogue` — and the reader no longer matches [2] to a list below.
 * `linerCard` keeps every word; only the numbers go. The set lines are typeset,
 * not rewritten: the band's `>` and `->` draw as › and →. */
const JOIN: Record<NonNullable<SetPiece["join"]>, string> = { ",": ",", ">": "›", "->": "→" };

function SetLine({ set }: { set: LinerSet }) {
  return (
    <div className="grid grid-cols-[5.2rem_minmax(0,1fr)] gap-2.5 border-t border-line py-2.5">
      <span className="pt-px text-[0.85rem] font-extrabold lowercase text-muted">{set.label}</span>
      <div className="min-w-0">
        <p className="text-[0.92rem] leading-[1.75]">
          {set.pieces.map((p, i) => {
            const song = (
              <span className={set.quiet ? "font-medium text-muted" : "font-bold text-ink"}>{p.song}</span>
            );
            const tags = p.tags.map((t, k) => (
              <PlainTag key={k} className="ml-1.5 mr-0.5 align-[1px]">
                {t}
              </PlainTag>
            ));
            const join = p.join === "," ? (
              <span className="text-muted">,</span>
            ) : p.join ? (
              <span className="font-extrabold text-muted"> {JOIN[p.join]}</span>
            ) : null;
            return (
              <Fragment key={i}>
                {song}
                {/* A comma stays with the tag before it, never alone at a line's start. */}
                {tags.length > 0 && p.join === "," ? (
                  <span className="whitespace-nowrap">
                    {tags}
                    {join}
                  </span>
                ) : (
                  <>
                    {tags}
                    {join}
                  </>
                )}
                {p.join ? " " : null}
              </Fragment>
            );
          })}
        </p>
        {set.asides.map((a, i) => (
          <p key={i} className="mt-1 text-[0.85rem] text-muted">
            <span className="mr-1 font-bold text-ink">{a.song}</span>
            {a.note}
          </p>
        ))}
      </div>
    </div>
  );
}

function LinerCard({ note }: { note: CoachsNoteRow }) {
  const { place, blocks } = linerCard(note.coachNotes);
  const venue = note.venueName ?? place ?? formatShortDate(note.showDate);
  const where = place && note.venueName && place.startsWith(`${note.venueName}, `) ? place.slice(note.venueName.length + 2) : place;
  return (
    <article className="coach-card rounded-[22px] bg-[var(--card-stock)] p-[18px] shadow-[inset_0_0_0_1px_var(--frost),0_18px_30px_-22px_rgba(0,0,0,0.8)]">
      {/* Filed like a show in the crate: the date tile beside the venue. */}
      <header className="mb-3 grid grid-cols-[64px_minmax(0,1fr)] items-start gap-3.5">
        <DateTile iso={note.showDate} className="yeti-tile-sm w-[64px]" />
        <div className="grid min-w-0 gap-px">
          <h3 className="text-[1.05rem] font-black leading-tight text-ink">
            <span className="sr-only">{formatShortDate(note.showDate)} · </span>
            {venue}
          </h3>
          {where && where !== venue && <p className="text-[0.82rem] text-muted">{where}</p>}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            {note.bandcampUrl && isBandcampUrl(note.bandcampUrl) && (
              <a
                href={note.bandcampUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-[var(--snow)] px-3 py-[5px] text-[0.82rem] font-extrabold text-[var(--night)] transition hover:bg-white"
              >
                listen on bandcamp ↗
              </a>
            )}
            <Link href={showHref(note.showDate, note.showOrder)} className={`text-[0.82rem] ${chromeLink}`}>
              the show →
            </Link>
          </p>
        </div>
      </header>
      {blocks.map((b, i) =>
        b.kind === "set" ? (
          <SetLine key={i} set={b.set} />
        ) : b.kind === "row" ? (
          <p key={i} className="border-t border-line py-2.5 text-[0.88rem] text-muted">
            <b className="mr-1 font-extrabold lowercase">{b.label}</b> {b.value}
          </p>
        ) : (
          <p key={i} className="border-t border-line py-2.5 text-[0.88rem] text-muted">
            {b.text}
          </p>
        ),
      )}
    </article>
  );
}

export function CoachsNotes({ data, edition }: { data: CoachsNoteRow[]; edition: Experience }) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-faint">No coach&apos;s notes archived yet.</p>;
  }
  if (edition === "fancy") {
    return (
      <>
        <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-5">
          {data.map((note) => (
            <LinerCard key={note.showId} note={note} />
          ))}
        </div>
        <p className="mt-4 font-mono text-[0.62rem] text-faint">
          › and → are the band&apos;s own &gt; and -&gt;; a tag is the coach&apos;s note on the song before it.
        </p>
      </>
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


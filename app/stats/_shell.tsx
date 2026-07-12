import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/app/_components/container";
import { CUTS, type CutMeta } from "./cuts";
import type { SongSort } from "@/lib/queries/songs";

export function songsSortHref(key: SongSort): string {
  return key === "played" ? "/songs" : `/songs?sort=${key}`;
}

/** Minimal-experience cut switcher: the text-list variant of CutSwitcher.
 * Bolds the active title, dot-separates the rest. Used from both /stats/[cut]
 * and /stats/oracle so a copy-tweak stays in one place. */
export function MinimalCutRow({ active }: { active: string }) {
  return (
    <p className="doc-crumb">
      {CUTS.map((c, i) => (
        <span key={c.slug}>
          {i > 0 && " · "}
          {c.slug === active ? <strong>{c.title}</strong> : <Link href={`/stats/${c.slug}`}>{c.title}</Link>}
        </span>
      ))}
    </p>
  );
}

/** Minimal-experience methodology footnote: the plain-text variant of the
 * StatsShell footer. Mirrors the fancy version's optional "same sort, full
 * catalog" tail. */
export function MinimalNoteRow({ cut }: { cut: CutMeta }) {
  return (
    <p className="doc-crumb">
      {cut.note}
      {cut.songsSort && <> · <Link href={songsSortHref(cut.songsSort)}>full catalog</Link></>}
    </p>
  );
}

export function CutSwitcher({ active }: { active: string }) {
  return (
    <nav aria-label="Stats cuts" className="mb-5 flex flex-wrap items-center gap-1.5 font-mono text-xs">
      {CUTS.map((c) => (
        <Link
          key={c.slug}
          href={`/stats/${c.slug}`}
          aria-current={c.slug === active ? "page" : undefined}
          className={c.slug === active ? "rounded-full bg-gold/15 px-3 py-1 text-gold ring-1 ring-gold/40" : "rounded-full px-3 py-1 text-muted transition hover:text-ink"}
        >
          {c.title}
        </Link>
      ))}
    </nav>
  );
}

export function StatsShell({ cut, children }: { cut: CutMeta; children: ReactNode }) {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line">
        <div className="stage-glow inset-x-0 top-0 h-72" />
        <Container className="relative py-9">
          <span className="eyebrow">
            <Link href="/stats" className="hover:text-gold">
              Stats
            </Link>
          </span>
          <h1 className="mt-3 font-display text-[2.2rem] leading-none tracking-tight text-ink sm:text-4xl">
            {cut.title}
          </h1>
          <p className="mt-2 font-mono text-xs text-faint">{cut.blurb}</p>
        </Container>
      </header>
      <Container className="py-8">
        <CutSwitcher active={cut.slug} />
        {children}
        <p className="mt-8 border-t border-line pt-3 font-mono text-[0.68rem] text-faint">
          {cut.note}
          {cut.songsSort && (
            <> · <Link href={songsSortHref(cut.songsSort)} className="underline hover:text-gold">same sort, full catalog →</Link></>
          )}
        </p>
      </Container>
    </>
  );
}

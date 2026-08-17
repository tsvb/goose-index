import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/app/_components/container";
import { FilterLink, FilterRow, chromeLink } from "@/app/_components/page-chrome";
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
    <nav aria-label="Stats cuts" className="mb-5">
      <FilterRow>
        {CUTS.map((c) => (
          <FilterLink key={c.slug} href={`/stats/${c.slug}`} active={c.slug === active}>
            {c.title}
          </FilterLink>
        ))}
      </FilterRow>
    </nav>
  );
}

export function StatsShell({ cut, children }: { cut: CutMeta; children: ReactNode }) {
  return (
    <>
      {/* PageHead-style markup, written inline: the kicker carries a real
          stats link (PageHead's own kicker is plain text only). */}
      <header className="border-b border-line">
        <Container className="py-10 sm:py-14">
          <p className="text-[0.7rem] lowercase text-faint">
            <Link href="/stats" className={chromeLink}>
              stats
            </Link>
          </p>
          <h1 className="mt-1 text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-4xl">
            {cut.title}
          </h1>
          <p className="mt-2 font-mono text-[0.75rem] text-faint">{cut.blurb}</p>
        </Container>
      </header>
      <Container className="py-8">
        <CutSwitcher active={cut.slug} />
        {children}
        <p className="mt-8 border-t border-line pt-3 font-mono text-[0.68rem] text-faint">
          {cut.note}
          {cut.songsSort && (
            <> · <Link href={songsSortHref(cut.songsSort)} className={chromeLink}>same sort, full catalog →</Link></>
          )}
        </p>
      </Container>
    </>
  );
}

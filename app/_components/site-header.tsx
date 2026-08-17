import Link from "next/link";
import { Container } from "./container";
import { NavLink } from "./nav-links";
import { SearchBox } from "./search-box";
import { MobileNav } from "./mobile-nav";
import { SettingsMenu } from "./settings-menu";
import { PenRule } from "./pen";
import { getExperience } from "@/lib/experience.server";
import { type Experience } from "@/lib/experience";

const NAV = [
  { href: "/shows", label: "Shows" },
  { href: "/songs", label: "Songs" },
  { href: "/stats", label: "Stats" },
  { href: "/on-this-day", label: "On This Day" },
  { href: "/venues", label: "Venues" },
  { href: "/tours", label: "Tours" },
  { href: "/blog", label: "Blog" },
];

export function HeaderFancy({ experience }: { experience: Experience }) {
  return (
    // --header-h is the full header box: h-14 plus the 6px PenRule below
    // it — MobileNav offsets its sheet from it, and without the rule's
    // height the sheet overlaps it.
    <header className="sticky top-0 z-40 bg-paper [--header-h:calc(3.5rem_+_6px)]">
      <Container className="flex h-14 items-center justify-between gap-4">
        <Link href="/" className="shrink-0 text-[0.95rem] font-semibold lowercase tracking-tight text-ink hover:text-steel">
          goose index
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-3 text-[0.85rem] lowercase text-muted md:flex lg:gap-5">
          {NAV.map((n) => (
            <NavLink
              key={n.href}
              href={n.href}
              className="whitespace-nowrap py-1 underline-offset-4 transition"
              activeClassName="text-steel underline"
              inactiveClassName="hover:text-ink hover:underline"
            >
              {n.label.toLowerCase()}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <SearchBox />
          <SettingsMenu current={experience} />
          <MobileNav />
        </div>
      </Container>
      <Container>
        <PenRule seed="masthead" />
      </Container>
    </header>
  );
}

export function HeaderFunctional({ experience }: { experience: Experience }) {
  return (
    // --header-h mirrors the Container's h-12 — MobileNav offsets its sheet from it.
    <header className="w2-appbar sticky top-0 z-40 [--header-h:3rem]">
      <Container className="flex h-12 items-center justify-between gap-4">
        <Link href="/" className="w2-brand flex items-center text-[1.05rem]">
          Goose Index<span className="w2-beta">BETA</span>
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-0.5 text-[0.75rem] md:flex lg:gap-1 lg:text-[0.8rem]">
          {NAV.map((n) => (
            <NavLink key={n.href} href={n.href} className="w2-navlink whitespace-nowrap">{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {/* appbar-search: scopes the appbar's white-on-gel input reskin
              (globals.css) to this instance only, so it can't also catch the
              mobile-nav sheet's input — MobileNav renders inside this same
              header as a DOM descendant of .w2-appbar. */}
          <SearchBox className="appbar-search" />
          <SettingsMenu current={experience} />
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}

export function HeaderMinimal({ experience }: { experience: Experience }) {
  return (
    <header className="border-b border-line">
      <Container className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
        <Link href="/" className="font-medium underline">Goose Index</Link>
        <span className="text-faint" aria-hidden>·</span>
        {NAV.map((n) => (
          <NavLink key={n.href} href={n.href} className="underline" activeClassName="font-semibold">{n.label}</NavLink>
        ))}
        <NavLink href="/search" className="underline" activeClassName="font-semibold">Search</NavLink>
        <span className="ml-auto"><SettingsMenu current={experience} /></span>
      </Container>
    </header>
  );
}

export async function SiteHeader() {
  const experience = await getExperience();
  if (experience === "minimal") return <HeaderMinimal experience={experience} />;
  if (experience === "functional") return <HeaderFunctional experience={experience} />;
  return <HeaderFancy experience={experience} />;
}

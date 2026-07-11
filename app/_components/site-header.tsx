import Link from "next/link";
import { Container } from "./container";
import { NavLink } from "./nav-links";
import { SearchBox } from "./search-box";
import { MobileNav } from "./mobile-nav";
import { SettingsMenu } from "./settings-menu";
import { Feather } from "./marks";
import { getExperience } from "@/lib/experience.server";
import { type Experience } from "@/lib/experience";

const NAV = [
  { href: "/shows", label: "Shows" },
  { href: "/songs", label: "Songs" },
  { href: "/stats", label: "Stats" },
  { href: "/on-this-day", label: "On This Day" },
  { href: "/venues", label: "Venues" },
  { href: "/tours", label: "Tours" },
];

export function HeaderFancy({ experience }: { experience: Experience }) {
  return (
    // --header-h mirrors the Container's h-16 — MobileNav offsets its sheet from it.
    <header className="sticky top-0 z-40 border-b border-line/80 bg-bg/85 backdrop-blur-md [--header-h:4rem]">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-full border border-line text-gold transition group-hover:border-gold group-hover:rotate-[8deg]">
            <Feather className="h-[18px] w-[18px]" />
          </span>
          <span className="font-display text-[1.15rem] leading-none tracking-tight">
            Goose <span className="italic text-gold">Index</span>
          </span>
        </Link>
        {/* Tighter tracking in the 768–1024 band so six links + search fit one row. */}
        <nav aria-label="Primary" className="hidden items-center gap-2.5 text-[0.82rem] text-muted md:flex lg:gap-4 lg:text-[0.9rem]">
          {NAV.map((n) => (
            <NavLink
              key={n.href}
              href={n.href}
              className="relative whitespace-nowrap py-1 transition"
              activeClassName="text-gold"
              inactiveClassName="hover:text-ink"
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <SearchBox />
          <SettingsMenu current={experience} />
          <MobileNav />
        </div>
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
          <SearchBox />
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

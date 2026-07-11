"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Section-level match: /shows is current on /shows and /shows/2025-06-25 but
 * never on a sibling section. Same rule the mobile drawer applies.
 */
export function isNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

/**
 * Header nav link that knows the current section. The site headers are server
 * components, so this tiny client wrapper reads the pathname (the way
 * MobileNav does) and adds aria-current="page" plus the caller's active
 * styling; each header keeps its own skin via the class props.
 */
export function NavLink({
  href,
  className,
  activeClassName,
  inactiveClassName,
  children,
}: {
  href: string;
  className: string;
  activeClassName?: string;
  inactiveClassName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const active = isNavActive(pathname, href);
  const extra = active ? activeClassName : inactiveClassName;
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={extra ? `${className} ${extra}` : className}
    >
      {children}
    </Link>
  );
}

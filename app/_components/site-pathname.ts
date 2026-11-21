"use client";

import { usePathname } from "next/navigation";

/**
 * The page's public path, without the `/edition/<experience>` prefix that
 * middleware.ts rewrites every page to. Depending on how a page was rendered,
 * Next's usePathname can report either form; stripping the prefix makes the
 * server render and the browser agree, and keeps links built from it public.
 */
export function stripEdition(pathname: string): string {
  const m = /^\/edition\/[^/]+(\/.*)?$/.exec(pathname);
  return m ? m[1] ?? "/" : pathname;
}

export function useSitePathname(): string {
  return stripEdition(usePathname() ?? "");
}

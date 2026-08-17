import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const h = vi.hoisted(() => ({ forcedOpen: false, pathname: "/" }));

// The drawer only renders when `open` is true, and the node test environment
// can't click the trigger. Flip MobileNav's first useState(false) — the open
// flag — to true so the drawer's markup is renderable; every other hook runs
// untouched.
vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  const useState = ((init: unknown) => {
    if (init === false && !h.forcedOpen) {
      h.forcedOpen = true;
      return actual.useState(true);
    }
    return actual.useState(init);
  }) as typeof actual.useState;
  return { ...actual, useState };
});

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => h.pathname,
}));

import { MobileNav, bindSheetDismissal } from "./mobile-nav";

beforeEach(() => {
  h.forcedOpen = false;
  h.pathname = "/";
});

describe("MobileNav drawer", () => {
  it("mentions songs in the search placeholder", () => {
    const html = renderToStaticMarkup(<MobileNav />);
    expect(html).toContain('placeholder="search songs, shows, venues…"');
  });

  it("renders the section links", () => {
    const html = renderToStaticMarkup(<MobileNav />);
    expect(html).toContain('href="/songs"');
    expect(html).toContain('href="/shows"');
  });

  it("trigger is text (menu/close), not an icon-circle button", () => {
    const html = renderToStaticMarkup(<MobileNav />);
    const trigger = html.match(/<button[^>]*aria-expanded[^>]*>([^<]*)<\/button>/)?.[1];
    expect(trigger).toBe("close"); // forced open by the useState mock above
    expect(html).not.toContain("rounded-full border border-line");
  });

  it("sheet is a hairline border, no drop shadow", () => {
    const html = renderToStaticMarkup(<MobileNav />);
    expect(html).toContain("bg-paper");
    expect(html).not.toContain("shadow");
  });

  it("nav links render lowercase text, no text-gold anywhere", () => {
    const html = renderToStaticMarkup(<MobileNav />);
    expect(html).toContain(">shows<");
    expect(html).not.toContain("text-gold");
  });

  it("the active section link reads text-steel; the rest stay text-ink", () => {
    h.pathname = "/shows";
    const html = renderToStaticMarkup(<MobileNav />);
    const showsLink = html.match(/<a[^>]*href="\/shows"[^>]*>[^<]*<\/a>/)?.[0];
    const songsLink = html.match(/<a[^>]*href="\/songs"[^>]*>[^<]*<\/a>/)?.[0];
    expect(showsLink).toContain("text-steel");
    expect(songsLink).toContain("text-ink");
    expect(songsLink).not.toContain("text-steel");
  });

  it("offsets the scrim and sheet by the live header height, not a hardcoded top-16", () => {
    const html = renderToStaticMarkup(<MobileNav />);
    expect(html.match(/top-\[var\(--header-h,4rem\)\]/g)?.length).toBe(2); // scrim + sheet
    expect(html).not.toContain("top-16");
  });

  it("caps the sheet at the remaining viewport and scrolls it (landscape phones)", () => {
    const html = renderToStaticMarkup(<MobileNav />);
    expect(html).toContain("max-h-[calc(100dvh-var(--header-h,4rem))]");
    expect(html).toContain("overflow-y-auto");
  });

  it("its own search input never carries the appbar-search hook — the functional appbar's white-on-gel input rule (globals.css) must not reach it", () => {
    // MobileNav renders inside the same <header> as the functional appbar's
    // .w2-appbar class (a DOM descendant, via site-header.tsx), so a bare
    // `.w2-appbar input` rule used to also catch this sheet's input — white
    // text on the sheet's own bg-paper, ~1.16:1, effectively invisible. The
    // fix scopes that rule to `.appbar-search`, a hook only the appbar's own
    // inline SearchBox carries (see site-header.tsx's HeaderFunctional).
    const html = renderToStaticMarkup(<MobileNav />);
    expect(html).not.toContain("appbar-search");
    // ...and it keeps its own layered ink/faint utilities as its only color
    // source, not a hardcoded white.
    expect(html).toContain("text-ink placeholder:text-faint");
  });
});

describe("bindSheetDismissal — Escape closes, background scroll locks", () => {
  function stubDocument(initialOverflow = "") {
    const listeners = new Map<string, Set<(e: unknown) => void>>();
    const doc = {
      addEventListener(type: string, fn: (e: unknown) => void) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(fn);
      },
      removeEventListener(type: string, fn: (e: unknown) => void) {
        listeners.get(type)?.delete(fn);
      },
      body: { style: { overflow: initialOverflow } },
    };
    const fire = (type: string, e: unknown) => listeners.get(type)?.forEach((fn) => fn(e));
    return { doc: doc as unknown as Document, fire };
  }

  it("closes on Escape and ignores other keys", () => {
    const { doc, fire } = stubDocument();
    const close = vi.fn();
    bindSheetDismissal(doc, close);
    fire("keydown", { key: "Enter" });
    expect(close).not.toHaveBeenCalled();
    fire("keydown", { key: "Escape" });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("locks body scroll while bound and restores the prior value on cleanup", () => {
    const { doc } = stubDocument("visible");
    const cleanup = bindSheetDismissal(doc, () => {});
    expect(doc.body.style.overflow).toBe("hidden");
    cleanup();
    expect(doc.body.style.overflow).toBe("visible");
  });

  it("stops listening after cleanup", () => {
    const { doc, fire } = stubDocument();
    const close = vi.fn();
    const cleanup = bindSheetDismissal(doc, close);
    cleanup();
    fire("keydown", { key: "Escape" });
    expect(close).not.toHaveBeenCalled();
  });
});

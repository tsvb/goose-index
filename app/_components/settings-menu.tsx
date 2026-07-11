"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { allowsTheme, serializeExperienceCookie, type Experience } from "@/lib/experience";
import { Settings } from "./marks";
import { SettingsPanel, resolveTheme, type Theme } from "./settings-panel";

/** Where initial focus lands when the popover opens: the currently-selected
 *  experience option (aria-current), falling back to the first button. Takes
 *  a query function so the node tests can drive it without a DOM. */
export function initialFocusTarget<T>(query: (selector: string) => T | null): T | null {
  return query('button[aria-current="true"]') ?? query("button");
}

export function SettingsMenu({ current }: { current: Experience }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [isPending, startTransition] = useTransition();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const themeAllowed = allowsTheme(current);
  const isText = current === "minimal";

  useEffect(() => {
    const saved = resolveTheme(typeof localStorage !== "undefined" ? localStorage.getItem("ga-theme") : null);
    const attr = resolveTheme(document.documentElement.getAttribute("data-theme"));
    setTheme(saved ?? attr ?? "dark");
  }, []);

  useEffect(() => {
    if (!open) return;
    initialFocusTarget((sel) => panelRef.current?.querySelector<HTMLElement>(sel) ?? null)?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onPointer(e: PointerEvent) {
      const target = e.target as Node;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  function chooseExperience(next: Experience) {
    if (next === current) {
      setOpen(false);
      return;
    }
    document.cookie = serializeExperienceCookie(next);
    // Keep the popover up — dimmed and disabled — until the server re-renders
    // the new experience (the swapped header unmounts it, which closes it).
    startTransition(() => router.refresh());
  }

  function chooseTheme(next: Theme) {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ga-theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={isText ? undefined : "Settings"}
        className={
          isText
            ? "underline"
            : "grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:border-gold hover:text-gold"
        }
      >
        {isText ? "Settings" : <Settings className="h-[18px] w-[18px]" />}
      </button>

      {open && (
        <div ref={panelRef} role="dialog" aria-label="Site settings" className="absolute right-0 top-full z-50 mt-2">
          <SettingsPanel
            current={current}
            themeAllowed={themeAllowed}
            theme={theme}
            pending={isPending}
            onSelectExperience={chooseExperience}
            onSelectTheme={chooseTheme}
          />
        </div>
      )}
    </div>
  );
}

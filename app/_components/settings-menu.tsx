"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { allowsTheme, serializeExperienceCookie, type Experience } from "@/lib/experience";
import { Settings } from "./marks";
import { SettingsPanel, type Theme } from "./settings-panel";

export function SettingsMenu({ current }: { current: Experience }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const themeAllowed = allowsTheme(current);
  const isText = current === "minimal";

  useEffect(() => {
    const saved =
      (typeof localStorage !== "undefined" && (localStorage.getItem("ga-theme") as Theme | null)) || null;
    const attr = document.documentElement.getAttribute("data-theme") as Theme | null;
    setTheme(saved ?? attr ?? "dark");
  }, []);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector<HTMLElement>("button")?.focus();
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
    if (next !== current) {
      document.cookie = serializeExperienceCookie(next);
      router.refresh();
    }
    setOpen(false);
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
            onSelectExperience={chooseExperience}
            onSelectTheme={chooseTheme}
          />
        </div>
      )}
    </div>
  );
}

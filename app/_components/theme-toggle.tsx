"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "./marks";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" &&
      (localStorage.getItem("ga-theme") as "dark" | "light" | null)) || null;
    const current = document.documentElement.getAttribute("data-theme") as "dark" | "light" | null;
    setTheme(saved ?? current ?? "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("ga-theme", next);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted transition hover:border-gold hover:text-gold"
    >
      {mounted && theme === "dark" ? <Moon className="h-[18px] w-[18px]" /> : <Sun className="h-[18px] w-[18px]" />}
    </button>
  );
}

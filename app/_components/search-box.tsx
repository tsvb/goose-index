"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "./marks";

export function SearchBox({ size = "compact" }: { size?: "compact" | "full" }) {
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  if (size === "full") {
    return (
      <form onSubmit={submit} className="group relative w-full">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint transition group-focus-within:text-gold" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Try a date (2022-06-24), a venue, or a city…"
          aria-label="Search the index"
          className="w-full rounded-full border border-line bg-surface py-3.5 pl-12 pr-4 text-ink placeholder:text-faint outline-none transition focus:border-gold"
        />
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="group relative hidden sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition group-focus-within:text-gold" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search…"
        aria-label="Search the index"
        className="w-36 rounded-full border border-line bg-surface/60 py-2 pl-8 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:w-52 focus:border-gold"
      />
    </form>
  );
}

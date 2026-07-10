"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Search } from "./marks";

type Size = "compact" | "full";

// useSearchParams requires a Suspense boundary when the header renders inside
// a statically prerendered page; the fallback is the same box unseeded, so the
// layout never shifts.
export function SearchBox({ size = "compact" }: { size?: Size }) {
  return (
    <Suspense fallback={<SearchBoxForm size={size} seed="" />}>
      <SeededSearchBox size={size} />
    </Suspense>
  );
}

function SeededSearchBox({ size }: { size: Size }) {
  const pathname = usePathname();
  const params = useSearchParams();
  // Only echo ?q= on /search itself — elsewhere (e.g. /songs?q=) q is a local
  // filter that shouldn't leak into the global search box.
  const seed = pathname === "/search" ? (params.get("q") ?? "") : "";
  return <SearchBoxForm size={size} seed={seed} />;
}

function SearchBoxForm({ size, seed }: { size: Size; seed: string }) {
  const router = useRouter();
  const [q, setQ] = useState(seed);

  // Echo the URL's query back into the box, and re-seed on client-side
  // navigation to a new query; edits in between stay untouched.
  useEffect(() => setQ(seed), [seed]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
  }

  function selectAll(e: React.FocusEvent<HTMLInputElement>) {
    e.currentTarget.select();
  }

  if (size === "full") {
    return (
      <form onSubmit={submit} className="group relative w-full">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint transition group-focus-within:text-gold" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={selectAll}
          placeholder="Try a song, a date (2022-06-24), a venue, or a city…"
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
        onFocus={selectAll}
        placeholder="Search…"
        aria-label="Search the index"
        className="w-36 rounded-full border border-line bg-surface/60 py-2 pl-8 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:w-52 focus:border-gold"
      />
    </form>
  );
}

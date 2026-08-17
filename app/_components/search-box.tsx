"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Search } from "./marks";
import { clsx } from "./clsx";

type Size = "compact" | "full";

// useSearchParams requires a Suspense boundary when the header renders inside
// a statically prerendered page; the fallback is the same box unseeded, so the
// layout never shifts.
//
// className is a hook for the *caller's* site, not the box's own look — e.g.
// the functional appbar's `.w2-appbar input` reskin needs to land on this one
// inline instance without also catching unrelated inputs elsewhere in the
// header's DOM subtree (the mobile-nav sheet's input among them). Give it a
// scoped class instead of matching every `input` under the appbar.
export function SearchBox({ size = "compact", className }: { size?: Size; className?: string }) {
  return (
    <Suspense fallback={<SearchBoxForm size={size} seed="" className={className} />}>
      <SeededSearchBox size={size} className={className} />
    </Suspense>
  );
}

function SeededSearchBox({ size, className }: { size: Size; className?: string }) {
  const pathname = usePathname();
  const params = useSearchParams();
  // Only echo ?q= on /search itself — elsewhere (e.g. /songs?q=) q is a local
  // filter that shouldn't leak into the global search box.
  const seed = pathname === "/search" ? (params.get("q") ?? "") : "";
  return <SearchBoxForm size={size} seed={seed} className={className} />;
}

function SearchBoxForm({ size, seed, className }: { size: Size; seed: string; className?: string }) {
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
      <form onSubmit={submit} className={clsx("group relative w-full", className)}>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-faint transition group-focus-within:text-steel" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={selectAll}
          placeholder="try a song, a date (2022-06-24), a venue, or a city…"
          aria-label="Search the index"
          className="w-full rounded-none border-0 border-b border-line bg-transparent py-3 pl-12 pr-4 text-ink placeholder:text-faint outline-none transition focus:border-steel"
        />
      </form>
    );
  }

  return (
    <form onSubmit={submit} className={clsx("group relative hidden sm:block", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint transition group-focus-within:text-steel" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={selectAll}
        placeholder="search…"
        aria-label="Search the index"
        className="w-36 rounded-none border-0 border-b border-line bg-transparent py-1.5 pl-8 pr-3 text-sm text-ink placeholder:text-faint outline-none transition focus:w-52 focus:border-steel"
      />
    </form>
  );
}

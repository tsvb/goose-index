import { clsx } from "./clsx";

/** Deterministic [0,1) stream from a string seed (FNV-1a into xorshift-ish
 * mixing). The pen must draw the same stroke on server, client, and in tests —
 * Math.random() would tear hydration. */
export function penRandom(seed: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 13), 1597334677);
    h = Math.imul(h ^ (h >>> 16), 2246822519);
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** Wobbly full-width horizontal rule — the pen's section/entry separator.
 * strength "strong" heads a section; "faint" separates entries. */
export function PenRule({
  seed,
  strength = "strong",
  className,
}: {
  seed: string;
  strength?: "strong" | "faint";
  className?: string;
}) {
  const r = penRandom(seed);
  const y = () => (2.2 + r() * 1.8).toFixed(2);
  const d = `M2 ${y()} C ${(40 + r() * 60).toFixed(0)} ${y()}, ${(120 + r() * 60).toFixed(0)} ${y()}, ${(
    200 + r() * 40
  ).toFixed(0)} ${y()} S ${(320 + r() * 50).toFixed(0)} ${y()}, 398 ${y()}`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 400 6"
      preserveAspectRatio="none"
      className={clsx("block h-[6px] w-full text-pencil", className)}
      style={strength === "faint" ? { opacity: 0.45 } : undefined}
      fill="none"
    >
      <path d={d} stroke="currentColor" strokeWidth={strength === "strong" ? 1.4 : 1.1} strokeLinecap="round" />
    </svg>
  );
}

/** Pencil italic margin note — the human caveat channel. Copy must be
 * computed at render time (CLAUDE.md rule 5); this component only dresses it. */
export function PenNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("text-[0.78rem] italic text-pencil", className)}>{children}</p>;
}

/** Small hand-drawn arrow. Default points left (margin note → subject). */
export function PenArrow({
  seed,
  direction = "left",
  className,
}: {
  seed: string;
  direction?: "left" | "right";
  className?: string;
}) {
  const r = penRandom(seed);
  const bend = (8 + r() * 8).toFixed(0);
  const d = `M56 ${bend} C 40 ${(Number(bend) - 4).toFixed(0)}, 18 ${(10 + r() * 6).toFixed(0)}, 6 26 M6 26 l 8 -2 M6 26 l 3 -8`;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 40"
      className={clsx("h-[36px] w-[52px] text-pencil", direction === "right" && "-scale-x-100", className)}
      fill="none"
    >
      <path d={d} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Hand ellipse for emphasis — at most one per section (spec: emphasis that is
 * everywhere is emphasis nowhere). Position it absolutely from the caller. */
export function PenCircle({ seed, className }: { seed: string; className?: string }) {
  const r = penRandom(seed);
  const d = `M12 23 C ${(8 + r() * 6).toFixed(0)} ${(6 + r() * 4).toFixed(0)}, ${(34 + r() * 8).toFixed(0)} 2, 58 6 S 88 ${(
    14 + r() * 8
  ).toFixed(0)}, 78 32 S ${(36 + r() * 8).toFixed(0)} 46, 20 40 S 8 32, 14 20`;
  return (
    <svg aria-hidden="true" viewBox="0 0 90 46" className={clsx("text-pencil", className)} fill="none">
      <path d={d} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

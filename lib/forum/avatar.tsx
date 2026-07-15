const PALETTE = ["#c9a227", "#3b7a57", "#2b6cb0", "#8b5cf6", "#c05621", "#38b2ac"];

function fnv1a(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic 5×5 mirrored identicon — the classic forum avatar, zero storage. */
export function Avatar({ username, size = 40 }: { username: string; size?: number }) {
  const normalized = username.toLowerCase();
  const h = fnv1a(normalized);
  const fill = PALETTE[h % PALETTE.length];
  const cells: boolean[] = Array.from({ length: 15 }, (_, i) => ((h >> (i * 2)) & 3) > 1);
  return (
    <svg width={size} height={size} viewBox="0 0 5 5" role="img" aria-label={`${normalized} avatar`}
      className="rounded-sm border border-line">
      {Array.from({ length: 5 }, (_, y) =>
        Array.from({ length: 5 }, (_, x) => {
          const col = x < 3 ? x : 4 - x; // mirror
          return cells[y * 3 + col]
            ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={fill} />
            : null;
        }),
      )}
    </svg>
  );
}

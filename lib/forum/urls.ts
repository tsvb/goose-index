export function threadPath(id: number, slug: string, page?: number): string {
  const base = `/forum/threads/${id}-${slug}`;
  return page && page > 1 ? `${base}?page=${page}` : base;
}

export function boardPath(slug: string, page?: number): string {
  const base = `/forum/${slug}`;
  return page && page > 1 ? `${base}?page=${page}` : base;
}

export function parseThreadKey(key: string): { id: number; slug: string | null } | null {
  const m = /^(\d+)(?:-(.*))?$/.exec(key);
  if (!m) return null;
  return { id: parseInt(m[1], 10), slug: m[2] ?? null };
}

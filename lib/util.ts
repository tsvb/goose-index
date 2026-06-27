export function toBool(v: unknown): boolean {
  return v === 1 || v === "1" || v === true;
}

export function emptyToNull(v: string | null | undefined): string | null {
  if (v === undefined || v === null) return null;
  return v.trim() === "" ? null : v;
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

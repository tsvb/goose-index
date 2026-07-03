export type Experience = "fancy" | "functional" | "minimal";

// Labels are web-era versions (3.0 = immersive, 2.0 = glossy utility,
// 1.0 = plain hypertext). Keys keep their original names — they're persisted
// in the ga_experience cookie, so renaming them would reset every visitor.
export const EXPERIENCES: { key: Experience; label: string; blurb: string }[] = [
  { key: "fancy", label: "3.0", blurb: "The full immersive edition" },
  { key: "functional", label: "2.0", blurb: "Dense, utility-first" },
  { key: "minimal", label: "1.0", blurb: "Plain, fast, machine-readable" },
];

export const EXPERIENCE_COOKIE = "ga_experience";
export const DEFAULT_EXPERIENCE: Experience = "fancy";

const KEYS: Experience[] = ["fancy", "functional", "minimal"];

export function resolveExperience(value: string | null | undefined): Experience {
  return KEYS.includes(value as Experience) ? (value as Experience) : DEFAULT_EXPERIENCE;
}

export function allowsTheme(experience: Experience): boolean {
  return experience === "fancy";
}

export function serializeExperienceCookie(experience: Experience): string {
  return `${EXPERIENCE_COOKIE}=${experience}; path=/; max-age=31536000; samesite=lax`;
}

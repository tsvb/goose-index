export type Experience = "fancy" | "functional" | "minimal";

// Labels are web-era versions (3.0 = immersive, 2.0 = glossy utility,
// 1.0 = plain hypertext). Keys keep their original names — they're persisted
// in the ga_experience cookie, so renaming them would reset every visitor.
//
// Blurbs say what you actually get, and only what this edition alone gets:
//   3.0  charts + themes + motion            (themes and atmosphere are fancy-only)
//   2.0  the same charts, Web 2.0 skin       (only `minimal` branches to tables)
//   1.0  a plain document, no charts at all
// "Machine-readable" was dropped from 1.0: JSON-LD ships from the root layout on
// every edition, so it was never a thing 1.0 alone offered.
export const EXPERIENCES: { key: Experience; label: string; blurb: string }[] = [
  { key: "fancy", label: "3.0", blurb: "Charts, themes, motion" },
  { key: "functional", label: "2.0", blurb: "Same charts, glossy skin" },
  { key: "minimal", label: "1.0", blurb: "Plain document, no charts" },
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

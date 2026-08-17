import { EXPERIENCES, type Experience } from "@/lib/experience";
import { THEME_VALUES, type Theme } from "@/lib/theme";
import { clsx } from "./clsx";

// The theme list, the default and the pre-paint script all live in lib/theme.ts
// — layout.tsx needs them too, and an App Router route file can't export them.
export { DEFAULT_THEME, resolveTheme, type Theme } from "@/lib/theme";

const THEME_LABELS: Record<Theme, string> = {
  auto: "auto",
  fog: "fog",
  slate: "slate",
};
export const THEMES = THEME_VALUES.map((value) => ({ value, label: THEME_LABELS[value] }));

export function SettingsPanel({
  current,
  themeAllowed,
  theme,
  pending = false,
  onSelectExperience,
  onSelectTheme,
}: {
  current: Experience;
  themeAllowed: boolean;
  theme: Theme;
  /** An experience switch is refreshing the page — dim and disable the options. */
  pending?: boolean;
  onSelectExperience: (next: Experience) => void;
  onSelectTheme: (next: Theme) => void;
}) {
  return (
    <div className="w-64 border-y border-line bg-paper p-3.5 text-ink">
      <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-wider text-faint">experience</p>
      <div className="flex flex-col gap-1">
        {EXPERIENCES.map((e) => {
          const selected = e.key === current;
          return (
            <button
              key={e.key}
              type="button"
              onClick={() => onSelectExperience(e.key)}
              disabled={pending}
              aria-current={selected ? "true" : undefined}
              className={clsx(
                "flex items-start gap-2.5 px-2.5 py-2 text-left transition disabled:opacity-60",
                selected ? "text-steel underline underline-offset-4" : "hover:text-ink",
              )}
            >
              <span
                aria-hidden
                className={clsx(
                  "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                  selected ? "bg-gold" : "bg-faint/50",
                )}
              />
              <span>
                <span className={clsx("block text-[0.85rem]", selected ? "text-gold" : "text-ink")}>
                  {e.label}
                </span>
                <span className="block text-[0.7rem] text-faint">{e.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      {themeAllowed ? (
        <>
          <div className="my-3 h-px bg-line" />
          <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-wider text-faint">appearance</p>
          <div role="group" aria-label="appearance" className="flex gap-4">
            {THEMES.map((t) => {
              const pressed = theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onSelectTheme(t.value)}
                  aria-pressed={pressed}
                  className={clsx(
                    "text-[0.8rem] lowercase underline-offset-4 transition",
                    pressed ? "text-steel underline font-semibold" : "text-muted underline hover:text-ink",
                  )}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-2.5 text-[0.7rem] leading-snug text-faint">
          appearance applies in the 3.0 experience.
        </p>
      )}
    </div>
  );
}

import { EXPERIENCES, type Experience } from "@/lib/experience";
import { Moon, Sun } from "./marks";
import { clsx } from "./clsx";

export type Theme = "dark" | "light";

const THEMES: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

export function SettingsPanel({
  current,
  themeAllowed,
  theme,
  onSelectExperience,
  onSelectTheme,
}: {
  current: Experience;
  themeAllowed: boolean;
  theme: Theme;
  onSelectExperience: (next: Experience) => void;
  onSelectTheme: (next: Theme) => void;
}) {
  return (
    <div className="w-64 rounded-xl border border-line bg-surface p-3.5 text-ink shadow-[0_24px_48px_-20px_var(--shadow)]">
      <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-wider text-faint">Experience</p>
      <div className="flex flex-col gap-1">
        {EXPERIENCES.map((e) => {
          const selected = e.key === current;
          return (
            <button
              key={e.key}
              type="button"
              onClick={() => onSelectExperience(e.key)}
              aria-current={selected ? "true" : undefined}
              className={clsx(
                "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                selected ? "bg-gold/15 ring-1 ring-gold/40" : "hover:bg-line/40",
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
          <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-wider text-faint">Appearance</p>
          <div role="group" aria-label="Appearance" className="flex gap-1 rounded-full border border-line p-0.5">
            {THEMES.map((t) => {
              const pressed = theme === t.value;
              const Icon = t.value === "dark" ? Moon : Sun;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onSelectTheme(t.value)}
                  aria-pressed={pressed}
                  className={clsx(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[0.75rem] transition",
                    pressed ? "bg-gold/15 text-gold" : "text-faint hover:text-ink",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-2.5 text-[0.7rem] leading-snug text-faint">
          Light and dark apply in the Fancy experience.
        </p>
      )}
    </div>
  );
}

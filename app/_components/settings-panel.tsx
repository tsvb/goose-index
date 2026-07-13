import { EXPERIENCES, type Experience } from "@/lib/experience";
import { Cassette, Disc, Moon, Sun } from "./marks";
import { clsx } from "./clsx";

export type Theme = "dark" | "light" | "pod" | "xl2";

const THEMES: { value: Theme; label: string; icon: typeof Moon }[] = [
  { value: "dark", label: "Dark", icon: Moon },
  { value: "light", label: "Light", icon: Sun },
  { value: "pod", label: "Pod", icon: Disc },
  { value: "xl2", label: "XL II", icon: Cassette },
];

/** Narrow an untrusted value (localStorage, DOM attribute) to a Theme. */
export function resolveTheme(value: string | null | undefined): Theme | null {
  return THEMES.some((t) => t.value === value) ? (value as Theme) : null;
}

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
              disabled={pending}
              aria-current={selected ? "true" : undefined}
              className={clsx(
                "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition disabled:opacity-60",
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
          {/* A grid, not a segmented row: four themes in one row leaves ~60px a
              button, which "XL II" cannot share with an icon — it wrapped and
              burst the pill. Two columns hold any even number of themes without
              the labels having to get shorter. */}
          <div role="group" aria-label="Appearance" className="grid grid-cols-2 gap-1">
            {THEMES.map((t) => {
              const pressed = theme === t.value;
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onSelectTheme(t.value)}
                  aria-pressed={pressed}
                  className={clsx(
                    "flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 py-1.5 text-[0.75rem] transition",
                    pressed
                      ? "border-gold/40 bg-gold/15 text-gold"
                      : "border-line text-faint hover:border-line hover:bg-line/40 hover:text-ink",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <p className="mt-2.5 text-[0.7rem] leading-snug text-faint">
          Themes apply in the 3.0 experience.
        </p>
      )}
    </div>
  );
}

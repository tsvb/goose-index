import { EXPERIENCES, type Experience } from "@/lib/experience";
import { clsx } from "./clsx";

/** The edition picker. 3.0 is dark only, so editions are the panel's one
 * choice; the old appearance row (fog/slate/auto) is gone in every edition.
 * 3.0 draws it as Yeti's segmented control on a shelf sheet; 2.0 and 1.0 keep
 * their ruled list. Exactly one option carries aria-current="true" — the menu
 * focuses it on open (initialFocusTarget). */
export function SettingsPanel({
  current,
  pending = false,
  onSelectExperience,
}: {
  current: Experience;
  /** An experience switch is refreshing the page — dim and disable the options. */
  pending?: boolean;
  onSelectExperience: (next: Experience) => void;
}) {
  if (current === "fancy") {
    return (
      <div className="settings-yeti w-72 rounded-[14px] bg-[var(--shelf)] p-4 text-ink shadow-[inset_0_0_0_1px_var(--frost),0_18px_30px_-22px_rgba(0,0,0,0.8)]">
        <p className="mb-2.5 text-[0.85rem] font-extrabold lowercase text-muted">edition</p>
        <div
          role="group"
          aria-label="edition"
          className="grid grid-cols-3 rounded-[12px] bg-[var(--night)] p-[3px] shadow-[inset_0_0_0_1px_var(--frost)]"
        >
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
                  "rounded-[9px] py-1.5 text-[0.95rem] font-extrabold transition disabled:opacity-60",
                  selected
                    ? "bg-[var(--segment-thumb)] text-ink shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                    : "text-muted hover:text-ink",
                )}
              >
                {e.label}
              </button>
            );
          })}
        </div>
        <dl className="mt-3 grid grid-cols-[2.2rem_1fr] gap-x-2 gap-y-1 text-[0.8rem]">
          {EXPERIENCES.map((e) => (
            <div key={e.key} className="contents">
              <dt className={clsx("font-bold", e.key === current ? "text-ink" : "text-faint")}>{e.label}</dt>
              <dd className={e.key === current ? "text-muted" : "text-faint"}>{e.blurb}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

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
                  selected ? "bg-steel" : "bg-faint/50",
                )}
              />
              <span>
                <span className={clsx("block text-[0.85rem]", selected ? "text-steel" : "text-ink")}>
                  {e.label}
                </span>
                <span className="block text-[0.7rem] text-faint">{e.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

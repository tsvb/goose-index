"use client";

import { useActionState } from "react";

// Drafts ride along in the state so a validation error re-renders the user's
// text even with JavaScript disabled (spec: errors preserve the draft).
export type ForumFormState = { error?: string; draftTitle?: string; draftBody?: string };
export type ForumAction = (prev: ForumFormState, fd: FormData) => Promise<ForumFormState>;

const field = "border border-line bg-transparent px-2 py-1";

export function Composer({ action, hidden, withTitle = false, initialBody = "", submitLabel }: {
  action: ForumAction;
  hidden: Record<string, string | number>;
  withTitle?: boolean;
  initialBody?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {} as ForumFormState);
  return (
    <form id="composer" action={formAction} className="flex flex-col gap-3 text-sm">
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {withTitle && (
        <label className="flex flex-col gap-1">Title
          <input name="title" required minLength={3} maxLength={120} defaultValue={state.draftTitle} className={field} />
        </label>
      )}
      <label className="flex flex-col gap-1">
        <span>Message — [b]bold[/b] [i]italic[/i] [url=…]link[/url] [quote=name]…[/quote] [code]…[/code]</span>
        <textarea id="composer-body" name="body" required rows={8} maxLength={20000}
          defaultValue={state.draftBody ?? initialBody} className={`${field} font-mono`} />
      </label>
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
      <button type="submit" className="self-start border border-line px-3 py-1 hover:border-line-soft">{submitLabel}</button>
    </form>
  );
}

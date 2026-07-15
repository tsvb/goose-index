"use client";

import { useActionState } from "react";
import type { AuthFormState } from "../auth-actions";

export type AuthAction = (prev: AuthFormState, fd: FormData) => Promise<AuthFormState>;

const field = "border border-line bg-transparent px-2 py-1";
const btn = "border border-line px-3 py-1 hover:border-line-soft";

export function JoinForm({ action }: { action: AuthAction }) {
  const [state, formAction] = useActionState(action, {} as AuthFormState);
  if (state.sent) {
    return <p>Check your email — we sent a link to finish joining. It works once and expires in 15 minutes.</p>;
  }
  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">Username
        <input name="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_-]+"
          title="3–20 characters: letters, numbers, - and _" className={field} />
      </label>
      <label className="flex flex-col gap-1">Email
        <input name="email" type="email" required className={field} />
      </label>
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
      <button type="submit" className={btn}>Join the forum</button>
    </form>
  );
}

export function LoginForm({ action }: { action: AuthAction }) {
  const [state, formAction] = useActionState(action, {} as AuthFormState);
  if (state.sent) {
    return <p>If that email has an account, a sign-in link is on its way. It works once and expires in 15 minutes.</p>;
  }
  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">Email
        <input name="email" type="email" required className={field} />
      </label>
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
      <button type="submit" className={btn}>Email me a sign-in link</button>
    </form>
  );
}

export function VerifyForm({ action, token }: { action: AuthAction; token: string }) {
  const [state, formAction] = useActionState(action, {} as AuthFormState);
  return (
    <form action={formAction} className="flex max-w-sm flex-col gap-3 text-sm">
      <input type="hidden" name="token" value={token} />
      {state.usernameTaken && (
        <label className="flex flex-col gap-1">That username was taken — pick another
          <input name="username" required minLength={3} maxLength={20} pattern="[A-Za-z0-9_-]+" className={field} />
        </label>
      )}
      {state.error && <p role="alert" className="text-red-600">{state.error}</p>}
      <button type="submit" className={btn}>
        {state.usernameTaken ? "Join with this username" : "Complete sign-in"}
      </button>
    </form>
  );
}

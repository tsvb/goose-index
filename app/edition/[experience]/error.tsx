"use client";

import { startTransition, useEffect, useState } from "react";
import Link from "@/app/_components/link";
import { useRouter } from "next/navigation";
import { Container } from "@/app/_components/container";
import { PageHead, chromeLink } from "@/app/_components/page-chrome";
import { clsx } from "@/app/_components/clsx";

/** How long after an automatic retry before another one is allowed. */
export const AUTO_RETRY_COOLDOWN_MS = 30_000;
const AUTO_RETRY_DELAY_MS = 1_200;

/**
 * Whether a page that just failed should try again by itself.
 *
 * Once, and then not again for a while. A page render that fails has usually
 * still stored the reads that did finish, so the second attempt has less to do
 * and tends to succeed — but a page that is truly broken would fail again and
 * mount this boundary again, and retrying on every mount is a loop that
 * hammers the server until the tab closes. `lastAt` lives outside the
 * component because the component is re-created on each failure.
 */
export function shouldAutoRetry(lastAt: number | null, now: number): boolean {
  return lastAt === null || now - lastAt > AUTO_RETRY_COOLDOWN_MS;
}

let lastAutoRetryAt: number | null = null;

/**
 * Shown in place of any page whose render threw on the server. Before this
 * existed the reader got Next's bare "Application error" screen and had to
 * know to reload.
 */
export default function PageError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);

  // A server-rendered page has to be fetched again, not just re-mounted:
  // refresh() asks the server for it, reset() drops this boundary.
  const retry = () => {
    setRetrying(true);
    startTransition(() => {
      router.refresh();
      reset();
    });
  };

  useEffect(() => {
    if (!shouldAutoRetry(lastAutoRetryAt, Date.now())) return;
    lastAutoRetryAt = Date.now();
    setRetrying(true);
    const timer = setTimeout(retry, AUTO_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
    // Runs once per failure; `retry` is recreated each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return (
    <Container className="py-16 text-center sm:py-24">
      <PageHead kicker="error" title="This page didn’t load.">
        <p className="mx-auto mt-5 max-w-sm text-lg leading-relaxed text-muted" role="status">
          {retrying ? "Trying again…" : "The server failed while putting it together."}
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button type="button" onClick={retry} disabled={retrying} className={clsx("lowercase disabled:opacity-60", chromeLink)}>
            try again
          </button>
          <span className="hidden text-line sm:inline">·</span>
          <Link href="/" className={clsx("lowercase", chromeLink)}>
            back to the index
          </Link>
        </div>
        {error.digest && (
          <p className="mt-8 font-mono text-[0.7rem] text-faint">reference {error.digest}</p>
        )}
      </PageHead>
    </Container>
  );
}

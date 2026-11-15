import { AsyncLocalStorage } from "node:async_hooks";

/**
 * At most `max` of the wrapped calls run at once; the rest wait their turn.
 *
 * Why the reads need this. The pool in db/client.ts holds 10 connections. When
 * all 10 are busy, postgres.js does not make the 11th query wait — it writes it
 * onto a busy connection behind the query already there (pipelining), and
 * Supavisor in transaction mode can deadlock on that (porsager/postgres#970,
 * the hang that once killed the sitemap build). One page stays under 10, but a
 * warm Vercel instance serves several requests at once, and right after a
 * deploy nothing is cached: /stats alone asks for nine reads, so one more
 * visitor is enough to overflow. The driver has no switch for this
 * (`max_pipeline: 0` breaks `sql.begin`), so the ceiling lives here.
 *
 * A wrapped call that makes another wrapped call (one cached read built on
 * another) runs the inner one on the slot it already holds. Queueing it would
 * deadlock the moment every slot was held by an outer call waiting on its
 * inner one.
 */
export function createLimiter(max: number): <T>(fn: () => T | Promise<T>) => Promise<T> {
  let active = 0;
  const waiting: (() => void)[] = [];
  const holdsSlot = new AsyncLocalStorage<true>();

  return async function limit<T>(fn: () => T | Promise<T>): Promise<T> {
    if (holdsSlot.getStore()) return fn();
    if (active < max) active++;
    else await new Promise<void>((resume) => waiting.push(resume));
    try {
      return await holdsSlot.run(true, fn);
    } finally {
      // Hand the slot straight to the next waiter; only free it if nobody is.
      const next = waiting.shift();
      if (next) next();
      else active--;
    }
  };
}

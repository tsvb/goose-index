import { AsyncLocalStorage } from "node:async_hooks";
import dc from "node:diagnostics_channel";
import { afterEach, describe, expect, it } from "vitest";
import postgres from "postgres";
import { CONNECT_CHANNEL, subscribeConnectKeepAlive } from "./connect-keepalive";

const channel = dc.tracingChannel(CONNECT_CHANNEL);

/** Settles to "pending" if the promise hasn't resolved by the next macrotask. */
async function state(p: Promise<unknown>): Promise<"settled" | "pending"> {
  return Promise.race([p.then(() => "settled" as const), new Promise<"pending">((r) => setTimeout(() => r("pending"), 0))]);
}

let unsubscribe: (() => void) | undefined;
afterEach(() => {
  unsubscribe?.();
  unsubscribe = undefined;
});

describe("subscribeConnectKeepAlive", () => {
  it("hands after() a promise when an attempt starts, and settles it when the attempt ends", async () => {
    const held: Promise<unknown>[] = [];
    unsubscribe = subscribeConnectKeepAlive((p) => held.push(p));

    const attempt = { host: "pooler", port: 6543 };
    channel.start.publish(attempt);
    expect(held).toHaveLength(1);
    expect(await state(held[0])).toBe("pending");

    channel.asyncEnd.publish(attempt);
    expect(await state(held[0])).toBe("settled");
  });

  it("holds each attempt separately", async () => {
    const held: Promise<unknown>[] = [];
    unsubscribe = subscribeConnectKeepAlive((p) => held.push(p));
    const a = {};
    const b = {};
    channel.start.publish(a);
    channel.start.publish(b);
    channel.asyncEnd.publish(a);
    expect(await state(held[0])).toBe("settled");
    expect(await state(held[1])).toBe("pending");
    channel.asyncEnd.publish(b);
    expect(await state(held[1])).toBe("settled");
  });

  it("leaves the attempt alone when there's no request to hold it in", () => {
    unsubscribe = subscribeConnectKeepAlive(() => {
      throw new Error("`after` was called outside a request scope");
    });
    expect(() => channel.start.publish({})).not.toThrow();
  });

  // The real driver, not a stand-in: proves postgres.js (the installed version)
  // publishes start and asyncEnd on this channel for an attempt that fails, the
  // case that matters most. Port 1 on loopback refuses at once.
  it("sees the installed postgres.js open and give up on a connection", async () => {
    const held: Promise<unknown>[] = [];
    unsubscribe = subscribeConnectKeepAlive((p) => held.push(p));
    const sql = postgres("postgres://u:p@127.0.0.1:1/db", { connect_timeout: 2, max: 1, backoff: () => 60, onnotice: () => {} });
    try {
      await expect(sql`select 1`).rejects.toThrow();
      expect(held.length).toBeGreaterThan(0);
      for (const p of held) expect(await state(p)).toBe("settled");
    } finally {
      await sql.end({ timeout: 0 });
    }
  });

  // Next's after() finds its request through AsyncLocalStorage, so the start
  // event has to run in the context of the code that ran the query — not in
  // some pool-internal one (postgres.js opens connections from inside its pool).
  it("runs in the async context of the query that asked for the connection", async () => {
    const request = new AsyncLocalStorage<string>();
    const seen: (string | undefined)[] = [];
    unsubscribe = subscribeConnectKeepAlive(() => seen.push(request.getStore()));
    const sql = postgres("postgres://u:p@127.0.0.1:1/db", { connect_timeout: 2, max: 4, backoff: () => 60, onnotice: () => {} });
    try {
      await request.run("req-1", () => expect(sql`select 1`).rejects.toThrow());
      expect(seen.length).toBeGreaterThan(0);
      expect(new Set(seen)).toEqual(new Set(["req-1"]));
    } finally {
      await sql.end({ timeout: 0 });
    }
  });
});

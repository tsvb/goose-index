import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));

import PageError, { shouldAutoRetry, AUTO_RETRY_COOLDOWN_MS } from "./error";

describe("shouldAutoRetry", () => {
  it("retries the first failure", () => {
    expect(shouldAutoRetry(null, 1_000)).toBe(true);
  });

  // A page that is really broken fails again and re-mounts the boundary;
  // retrying on every mount would loop against the server.
  it("does not retry again inside the cooldown", () => {
    expect(shouldAutoRetry(1_000, 1_000 + 2_000)).toBe(false);
    expect(shouldAutoRetry(1_000, 1_000 + AUTO_RETRY_COOLDOWN_MS)).toBe(false);
  });

  it("retries a later, separate failure", () => {
    expect(shouldAutoRetry(1_000, 1_000 + AUTO_RETRY_COOLDOWN_MS + 1)).toBe(true);
  });
});

describe("PageError markup", () => {
  const html = (error: Error & { digest?: string }) =>
    renderToStaticMarkup(<PageError error={error} reset={() => {}} />);

  it("says the page failed and offers a retry and a way out", () => {
    const out = html(new Error("boom"));
    expect(out).toContain("This page didn’t load.");
    expect(out).toContain("try again");
    expect(out).toContain('href="/"');
  });

  it("never prints the error message — it can name the database host", () => {
    expect(html(new Error("connect ECONNREFUSED db.internal:5432"))).not.toContain("ECONNREFUSED");
  });

  it("prints the digest, which is what ties the screen to a server log line", () => {
    expect(html(Object.assign(new Error("x"), { digest: "abc123" }))).toContain("reference abc123");
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LiveRefresh, bindLiveRefresh } from "./live-refresh";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {} }),
}));

/** Mutable stand-in for document — node tests run without a DOM. */
function stubDocument(hidden = false) {
  const listeners = new Map<string, Set<() => void>>();
  const doc = {
    hidden,
    addEventListener(type: string, fn: () => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: () => void) {
      listeners.get(type)?.delete(fn);
    },
  };
  const fire = (type: string) => listeners.get(type)?.forEach((fn) => fn());
  const count = (type: string) => listeners.get(type)?.size ?? 0;
  return { doc, fire, count };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("bindLiveRefresh — visibility-aware polling", () => {
  it("polls on the interval while the tab is visible", () => {
    const { doc } = stubDocument();
    const refresh = vi.fn();
    bindLiveRefresh(doc, refresh, 75_000);
    expect(refresh).not.toHaveBeenCalled();
    vi.advanceTimersByTime(75_000);
    expect(refresh).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(150_000);
    expect(refresh).toHaveBeenCalledTimes(3);
  });

  it("pauses polling while the tab is hidden", () => {
    const { doc, fire } = stubDocument();
    const refresh = vi.fn();
    bindLiveRefresh(doc, refresh, 75_000);
    doc.hidden = true;
    fire("visibilitychange");
    vi.advanceTimersByTime(300_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("refreshes immediately and resumes polling when the tab returns", () => {
    const { doc, fire } = stubDocument();
    const refresh = vi.fn();
    bindLiveRefresh(doc, refresh, 75_000);
    doc.hidden = true;
    fire("visibilitychange");
    doc.hidden = false;
    fire("visibilitychange");
    expect(refresh).toHaveBeenCalledTimes(1); // catch-up refresh on return
    vi.advanceTimersByTime(75_000);
    expect(refresh).toHaveBeenCalledTimes(2); // interval resumed
  });

  it("does not start the timer when bound in a hidden tab", () => {
    const { doc } = stubDocument(true);
    const refresh = vi.fn();
    bindLiveRefresh(doc, refresh, 75_000);
    vi.advanceTimersByTime(300_000);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not stack timers across repeated visibility flips", () => {
    const { doc, fire } = stubDocument();
    const refresh = vi.fn();
    bindLiveRefresh(doc, refresh, 75_000);
    fire("visibilitychange"); // still visible — must replace, not add
    fire("visibilitychange");
    refresh.mockClear();
    vi.advanceTimersByTime(75_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("cleanup stops the timer and unhooks the listener", () => {
    const { doc, fire, count } = stubDocument();
    const refresh = vi.fn();
    const cleanup = bindLiveRefresh(doc, refresh, 75_000);
    expect(count("visibilitychange")).toBe(1);
    cleanup();
    expect(count("visibilitychange")).toBe(0);
    fire("visibilitychange");
    vi.advanceTimersByTime(300_000);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("LiveRefresh markup", () => {
  it("renders the live pill by default", () => {
    const html = renderToStaticMarkup(<LiveRefresh />);
    expect(html).toContain("live-pill");
    expect(html).toContain("LIVE");
    expect(html).toContain('role="status"');
  });

  it("renders the doc line in minimal", () => {
    const html = renderToStaticMarkup(<LiveRefresh minimal />);
    expect(html).toContain("doc-live");
    expect(html).toContain("in progress");
    expect(html).not.toContain("live-pill");
  });
});

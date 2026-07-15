import { describe, it, expect, vi, afterEach } from "vitest";
import { sendMagicLink, authOrigin } from "./email";

afterEach(() => { delete process.env.RESEND_API_KEY; delete process.env.VERCEL; });

describe("sendMagicLink", () => {
  it("without RESEND_API_KEY logs the link instead of fetching", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchImpl = vi.fn();
    await sendMagicLink({ to: "a@b.co", url: "http://localhost:3000/forum/verify?token=T", kind: "login" }, fetchImpl as any);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(log.mock.calls.flat().join(" ")).toContain("/forum/verify?token=T");
    log.mockRestore();
  });

  it("with RESEND_API_KEY posts to Resend with auth header", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.AUTH_EMAIL_FROM = "Goose Index <forum@gooseindex.com>";
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    await sendMagicLink({ to: "a@b.co", url: "https://x/verify?token=T", kind: "signup" }, fetchImpl as any);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["a@b.co"]);
    expect(body.text).toContain("https://x/verify?token=T");
  });

  it("throws on a non-2xx response", async () => {
    process.env.RESEND_API_KEY = "re_test";
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 422, text: async () => "nope" });
    await expect(sendMagicLink({ to: "a@b.co", url: "u", kind: "login" }, fetchImpl as any)).rejects.toThrow(/422/);
  });
});

describe("authOrigin", () => {
  it("is localhost in dev and SITE_URL on Vercel", () => {
    expect(authOrigin()).toBe("http://localhost:3000");
    process.env.VERCEL = "1";
    expect(authOrigin()).toBe("https://www.gooseindex.com");
  });
});

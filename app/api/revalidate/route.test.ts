import { afterEach, describe, expect, it } from "vitest";
import { POST } from "./route";

describe("POST /api/revalidate", () => {
  afterEach(() => {
    delete process.env.REVALIDATE_SECRET;
  });

  it("returns 501 when the secret is not configured", async () => {
    const res = await POST(new Request("http://localhost/api/revalidate", { method: "POST" }));
    expect(res.status).toBe(501);
  });

  it("rejects a missing or wrong bearer token", async () => {
    process.env.REVALIDATE_SECRET = "s3cret";
    const missing = await POST(new Request("http://localhost/api/revalidate", { method: "POST" }));
    expect(missing.status).toBe(401);
    const wrong = await POST(new Request("http://localhost/api/revalidate", {
      method: "POST",
      headers: { authorization: "Bearer nope" },
    }));
    expect(wrong.status).toBe(401);
  });

  it("busts the catalog cache when the bearer matches", async () => {
    process.env.REVALIDATE_SECRET = "s3cret";
    const res = await POST(new Request("http://localhost/api/revalidate", {
      method: "POST",
      headers: { authorization: "Bearer s3cret" },
    }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ revalidated: true });
  });
});

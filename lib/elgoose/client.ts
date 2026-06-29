import type { ElgooseEnvelope, ElgooseClient } from "./types";

export interface ElgooseClientOptions {
  baseUrl?: string;
  userAgent?: string;
  fetchImpl?: typeof fetch;
  maxRetries?: number;
  retryDelayMs?: number;
}

const DEFAULT_BASE = "https://elgoose.net/api/v2";
const DEFAULT_UA = "GooseIndex/0.1 (goose index fan project)";

function buildUrl(baseUrl: string, method: string, params?: Record<string, string | number>): string {
  const qs = params
    ? "?" + Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join("&")
    : "";
  return `${baseUrl}/${method}.json${qs}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function createElgooseClient(opts: ElgooseClientOptions = {}): ElgooseClient {
  const baseUrl = opts.baseUrl ?? DEFAULT_BASE;
  const userAgent = opts.userAgent ?? DEFAULT_UA;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const maxRetries = opts.maxRetries ?? 3;
  const retryDelayMs = opts.retryDelayMs ?? 500;

  async function fetchMethod<T>(method: string, params?: Record<string, string | number>): Promise<T[]> {
    const url = buildUrl(baseUrl, method, params);
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetchImpl(url, { headers: { "User-Agent": userAgent } });
        if (res.status === 429 || res.status >= 500) {
          lastErr = new Error(`HTTP ${res.status} for ${method}`);
          if (attempt < maxRetries) { await sleep(retryDelayMs * (attempt + 1)); continue; }
          throw lastErr;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${method}`);
        const body = (await res.json()) as ElgooseEnvelope<T>;
        if (body.error) throw new Error(`elgoose error for ${method}: ${body.error_message}`);
        return body.data;
      } catch (err) {
        lastErr = err;
        const transient = err instanceof TypeError; // network error
        if (transient && attempt < maxRetries) { await sleep(retryDelayMs * (attempt + 1)); continue; }
        throw err;
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  return { fetchMethod };
}

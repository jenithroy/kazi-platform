import { PublicError } from "./http.ts";

// Pinned Graph version. Meta deprecates versions on a ~2 year cycle and silently changes
// field shapes between them, so it is explicit and overridable rather than "latest".
export const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") ?? "v23.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

// Graph error codes worth reacting to rather than just surfacing.
const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80000, 80004]);
const TOKEN_INVALID_CODES = new Set([102, 190, 463, 467]);

export class GraphError extends Error {
  code: number;
  subcode?: number;
  isRateLimit: boolean;
  isTokenInvalid: boolean;
  constructor(message: string, code: number, subcode?: number) {
    super(message);
    this.code = code;
    this.subcode = subcode;
    this.isRateLimit = RATE_LIMIT_CODES.has(code);
    this.isTokenInvalid = TOKEN_INVALID_CODES.has(code);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class GraphClient {
  #token: string;

  constructor(token: string) {
    this.#token = token;
  }

  /**
   * One Graph request with retries. Rate limits and 5xx are retried with exponential
   * backoff; everything else fails immediately, because retrying a rejected mutation just
   * makes the same mistake four more times.
   */
  async request<T>(
    path: string,
    { params = {}, method = "GET", body }: {
      params?: Record<string, string | number | undefined>;
      method?: "GET" | "POST" | "DELETE";
      body?: Record<string, unknown>;
    } = {},
  ): Promise<T> {
    const url = new URL(path.startsWith("http") ? path : `${GRAPH_BASE}/${path.replace(/^\//, "")}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }

    let attempt = 0;
    // 5 attempts spans ~15s of backoff, comfortably inside the function timeout while
    // still riding out the short per-account throttles Graph applies during a sync.
    const maxAttempts = 5;
    for (;;) {
      attempt++;
      const init: RequestInit = {
        method,
        headers: {
          // The OAuth token-exchange endpoints authenticate with query params instead, and
          // reject an empty bearer header — hence the conditional.
          ...(this.#token ? { authorization: `Bearer ${this.#token}` } : {}),
          ...(body ? { "content-type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      };

      let res: Response;
      try {
        res = await fetch(url, init);
      } catch (err) {
        if (attempt >= maxAttempts) throw new PublicError(`Could not reach the Meta API: ${err}`, 502);
        await sleep(2 ** attempt * 250);
        continue;
      }

      const text = await res.text();
      const payload = text ? safeJson(text) : {};

      if (res.ok) return payload as T;

      const error = (payload as { error?: { message?: string; code?: number; error_subcode?: number } })
        .error;
      const graphError = new GraphError(
        error?.message ?? `Meta API returned ${res.status}`,
        error?.code ?? res.status,
        error?.error_subcode,
      );

      const retryable = graphError.isRateLimit || res.status >= 500;
      if (retryable && attempt < maxAttempts) {
        await sleep(2 ** attempt * 500);
        continue;
      }
      throw graphError;
    }
  }

  /**
   * Follows Graph's cursor pagination. Capped at `maxPages` so a runaway account (tens of
   * thousands of ads) cannot hang the function until it is killed mid-write.
   */
  async all<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
    maxPages = 25,
  ): Promise<T[]> {
    const out: T[] = [];
    let next: string | undefined;
    for (let page = 0; page < maxPages; page++) {
      const res: { data?: T[]; paging?: { next?: string } } = next
        ? await this.request(next)
        : await this.request(path, { params: { limit: 100, ...params } });
      out.push(...(res.data ?? []));
      next = res.paging?.next;
      if (!next) break;
    }
    return out;
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: { message: text.slice(0, 300) } };
  }
}

/** Graph reports budgets in the currency's minor unit (cents); the ERP stores major units. */
export function fromMinorUnits(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n / 100 : null;
}

export function toMinorUnits(value: number): number {
  return Math.round(value * 100);
}

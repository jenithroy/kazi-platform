// Shared HTTP plumbing for the Meta Ads functions.

// The ERP is a static export served from its own origin, so browser calls to these
// functions are cross-origin and need CORS. ALLOWED_ORIGINS is a comma-separated function
// secret; requests from anywhere else get no CORS headers back and the browser drops the
// response.
const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin));
  return {
    // With no ALLOWED_ORIGINS configured we echo the caller's origin so local development
    // works out of the box; production should always set the secret.
    "access-control-allow-origin": allowed ? origin! : (allowedOrigins[0] ?? "*"),
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export function json(body: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "content-type": "application/json" },
  });
}

/** An error whose message is safe to show to the operator in the ERP UI. */
export class PublicError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function preflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

/** Wraps a handler so every thrown error becomes a JSON response instead of a 500 HTML page. */
export function handler(fn: (req: Request) => Promise<Response>) {
  return async (req: Request): Promise<Response> => {
    const origin = req.headers.get("origin");
    const pre = preflight(req);
    if (pre) return pre;
    try {
      return await fn(req);
    } catch (err) {
      if (err instanceof PublicError) {
        return json({ error: err.message }, err.status, origin);
      }
      // Anything unexpected is logged in full but reported vaguely: Graph errors can echo
      // back tokens and internal ids.
      console.error("unhandled function error", err);
      return json({ error: "Unexpected server error. Check the function logs." }, 500, origin);
    }
  };
}

export function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new PublicError(`Server is missing the ${name} secret — see docs/meta-ads.md`, 500);
  }
  return value;
}

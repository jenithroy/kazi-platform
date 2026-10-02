// Google OAuth and the parts of the Gmail API outreach uses: sending, and reading new mail
// (metadata only) to spot replies and bounces.
//
// The OAuth client is the "Internal" web app from docs/outreach.md: only accounts in the
// company's Google Workspace can connect, and Google doesn't need to review it.

import { ConfigError } from "./crypto.ts";

// Test-only: points every Google endpoint at a local stand-in. Never set in production.
const TEST_BASE = Deno.env.get("OUTREACH_GOOGLE_TEST_BASE");

export const ENDPOINTS = {
  authorize: TEST_BASE ? `${TEST_BASE}/o/oauth2/v2/auth` : "https://accounts.google.com/o/oauth2/v2/auth",
  token: TEST_BASE ? `${TEST_BASE}/token` : "https://oauth2.googleapis.com/token",
  revoke: TEST_BASE ? `${TEST_BASE}/revoke` : "https://oauth2.googleapis.com/revoke",
  gmail: TEST_BASE ? `${TEST_BASE}/gmail/v1/users/me` : "https://gmail.googleapis.com/gmail/v1/users/me",
  dns: TEST_BASE ? `${TEST_BASE}/dns-query` : "https://cloudflare-dns.com/dns-query",
};

export const GMAIL_SEND = "https://www.googleapis.com/auth/gmail.send";
export const GMAIL_READ = "https://www.googleapis.com/auth/gmail.readonly";
export const SCOPES = ["openid", "email", "profile", GMAIL_SEND, GMAIL_READ];

export class GoogleError extends Error {
  status: number;
  reason: string;
  constructor(message: string, status: number, reason: string) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

function client() {
  const id = Deno.env.get("GOOGLE_CLIENT_ID");
  const secret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  if (!id || !secret) {
    throw new ConfigError(
      "Gmail isn't set up yet: the GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET function secrets are missing (see docs/outreach.md).",
    );
  }
  return { id, secret };
}

export function authorizeUrl({ redirectUri, state, loginHint }: { redirectUri: string; state: string; loginHint?: string }) {
  const params = new URLSearchParams({
    client_id: client().id,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // Always show consent, so Google always returns a refresh token.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) params.set("login_hint", loginHint);
  return `${ENDPOINTS.authorize}?${params}`;
}

async function tokenRequest(body: Record<string, string>) {
  const { id, secret } = client();
  const response = await fetch(ENDPOINTS.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...body, client_id: id, client_secret: secret }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new GoogleError(data.error_description || data.error || `Google returned ${response.status}`, response.status, data.error ?? "");
  }
  return data as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    id_token?: string;
  };
}

export const exchangeCode = (code: string, redirectUri: string) =>
  tokenRequest({ code, redirect_uri: redirectUri, grant_type: "authorization_code" });

export const refreshAccessToken = (refreshToken: string) =>
  tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });

export async function revokeToken(token: string) {
  await fetch(ENDPOINTS.revoke, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch(() => undefined);
}

/** The claims in an ID token. It came straight from Google's token endpoint over TLS, so it isn't re-verified. */
export function idTokenClaims(idToken: string | undefined): Record<string, unknown> {
  const payload = idToken?.split(".")[1];
  if (!payload) return {};
  try {
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payload.length / 4) * 4, "="));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(json, (char) => char.charCodeAt(0))));
  } catch {
    return {};
  }
}

/** A Gmail API call; throws GoogleError with the HTTP status and Google's reason code. */
export async function gmail<T = any>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${ENDPOINTS.gmail}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (response.ok) return response.json();
  const data = await response.json().catch(() => ({}));
  const error = data.error ?? {};
  throw new GoogleError(
    error.message || `Gmail returned ${response.status}`,
    response.status,
    error.errors?.[0]?.reason ?? error.status ?? "",
  );
}

export type GmailHeaders = Record<string, string>;

/** Lower-cased header map from a Gmail message resource. */
export function messageHeaders(message: { payload?: { headers?: { name: string; value: string }[] } }): GmailHeaders {
  const headers: GmailHeaders = {};
  for (const { name, value } of message.payload?.headers ?? []) headers[name.toLowerCase()] = value;
  return headers;
}

/**
 * Whether a domain can receive email: true when it publishes MX records (or, with none, an
 * address record to fall back on), false when it doesn't exist or has a "null MX", null if
 * DNS couldn't be checked.
 */
export async function domainAcceptsMail(domain: string): Promise<boolean | null> {
  const lookup = async (type: string) => {
    const response = await fetch(`${ENDPOINTS.dns}?name=${encodeURIComponent(domain)}&type=${type}`, {
      headers: { Accept: "application/dns-json" },
    });
    if (!response.ok) throw new Error(`DNS lookup failed with ${response.status}`);
    return response.json() as Promise<{ Status: number; Answer?: { type: number; data: string }[] }>;
  };
  try {
    const mx = await lookup("MX");
    if (mx.Status === 3) return false;
    const exchanges = (mx.Answer ?? []).filter((record) => record.type === 15).map((record) => record.data.trim());
    if (exchanges.length) return exchanges.some((data) => !/^0\s+\.?$/.test(data));
    const address = await lookup("A");
    return (address.Answer ?? []).some((record) => record.type === 1);
  } catch {
    return null;
  }
}

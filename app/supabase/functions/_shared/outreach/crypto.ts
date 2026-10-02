// Encryption for stored Google tokens and signatures for the links and OAuth state the
// outreach functions hand out. Both keys are derived from one function secret,
// OUTREACH_SECRET (any random string of 32+ characters).

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export class ConfigError extends Error {}

type Bytes = Uint8Array<ArrayBuffer>;

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Bytes {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

let keys: Promise<{ aes: CryptoKey; hmac: CryptoKey }> | null = null;

function getKeys() {
  const secret = Deno.env.get("OUTREACH_SECRET") ?? "";
  if (secret.length < 32) {
    throw new ConfigError("Outreach isn't set up yet: the OUTREACH_SECRET function secret is missing or shorter than 32 characters (see docs/outreach.md).");
  }
  keys ??= (async () => {
    const base = await crypto.subtle.importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"]);
    const derive = (info: string, algorithm: AesKeyGenParams | HmacKeyGenParams, usages: KeyUsage[]) =>
      crypto.subtle.deriveKey(
        { name: "HKDF", hash: "SHA-256", salt: encoder.encode("kazi-outreach"), info: encoder.encode(info) },
        base,
        algorithm,
        false,
        usages,
      );
    return {
      aes: await derive("token-encryption", { name: "AES-GCM", length: 256 }, ["encrypt", "decrypt"]),
      hmac: await derive("signing", { name: "HMAC", hash: "SHA-256", length: 256 }, ["sign", "verify"]),
    };
  })();
  return keys;
}

export async function encryptSecret(plain: string): Promise<string> {
  const { aes } = await getKeys();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aes, encoder.encode(plain)));
  return `v1.${toBase64Url(iv)}.${toBase64Url(sealed)}`;
}

export async function decryptSecret(token: string): Promise<string> {
  const [version, iv, sealed] = token.split(".");
  if (version !== "v1" || !iv || !sealed) throw new Error("Stored credential is in an unknown format");
  const { aes } = await getKeys();
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64Url(iv) }, aes, fromBase64Url(sealed));
  return decoder.decode(plain);
}

async function hmac(data: Bytes): Promise<Bytes> {
  const { hmac } = await getKeys();
  return new Uint8Array(await crypto.subtle.sign("HMAC", hmac, data));
}

async function hmacMatches(data: Bytes, signature: Bytes): Promise<boolean> {
  const { hmac } = await getKeys();
  return crypto.subtle.verify("HMAC", hmac, signature, data);
}

/** A signed, expiring token carrying a small JSON payload (used for OAuth state). */
export async function signPayload(purpose: string, payload: Record<string, unknown>, ttlSeconds: number): Promise<string> {
  const body = encoder.encode(JSON.stringify({ ...payload, purpose, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${toBase64Url(body)}.${toBase64Url(await hmac(body))}`;
}

export async function verifyPayload(purpose: string, token: string): Promise<Record<string, unknown> | null> {
  const [body, signature] = String(token ?? "").split(".");
  if (!body || !signature) return null;
  try {
    const bytes = fromBase64Url(body);
    if (!(await hmacMatches(bytes, fromBase64Url(signature)))) return null;
    const payload = JSON.parse(decoder.decode(bytes));
    if (payload.purpose !== purpose || typeof payload.exp !== "number" || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const uuidBytes = (id: string): Bytes => Uint8Array.from(id.replace(/-/g, "").match(/../g)!, (pair) => parseInt(pair, 16));
const uuidFromBytes = (bytes: Uint8Array) => {
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

// Unsubscribe links never expire and have to stay short: the prospect id plus a truncated
// signature over it, 43 characters in all.
export async function unsubscribeToken(prospectId: string): Promise<string> {
  if (!UUID.test(prospectId)) throw new Error("Not a prospect id");
  const id = uuidBytes(prospectId);
  const signature = (await hmac(new Uint8Array([...encoder.encode("unsubscribe:"), ...id]))).slice(0, 16);
  return toBase64Url(new Uint8Array([...id, ...signature]));
}

export async function prospectFromUnsubscribeToken(token: string): Promise<string | null> {
  let bytes: Bytes;
  try {
    bytes = fromBase64Url(String(token ?? ""));
  } catch {
    return null;
  }
  if (bytes.length !== 32) return null;
  const id = bytes.slice(0, 16);
  const expected = (await hmac(new Uint8Array([...encoder.encode("unsubscribe:"), ...id]))).slice(0, 16);
  let difference = 0;
  for (let i = 0; i < 16; i++) difference |= expected[i] ^ bytes[16 + i];
  return difference === 0 ? uuidFromBytes(id) : null;
}

/** Constant-time string comparison for shared secrets. */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = encoder.encode(provided);
  const b = encoder.encode(expected);
  let difference = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) difference |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return difference === 0 && b.length > 0;
}

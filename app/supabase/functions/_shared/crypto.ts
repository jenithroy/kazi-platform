import { PublicError, requireEnv } from "./http.ts";

// Access tokens are encrypted at rest with AES-256-GCM rather than stored raw: a leaked
// database dump would otherwise hand over the ability to spend the ad budget. The key
// lives only in the function secret META_TOKEN_ENCRYPTION_KEY (32 bytes, base64).

async function key(): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(requireEnv("META_TOKEN_ENCRYPTION_KEY")), (c) => c.charCodeAt(0));
  if (raw.byteLength !== 32) {
    throw new PublicError("META_TOKEN_ENCRYPTION_KEY must be 32 bytes of base64", 500);
  }
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

const b64 = (buf: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function encryptToken(token: string): Promise<{ cipher: string; iv: string }> {
  // A fresh 96-bit IV per encryption; GCM is catastrophically broken by IV reuse.
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await key(),
    new TextEncoder().encode(token),
  );
  return { cipher: b64(cipher), iv: b64(iv) };
}

export async function decryptToken(cipher: string, iv: string): Promise<string> {
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(iv) },
      await key(),
      unb64(cipher),
    );
    return new TextDecoder().decode(plain);
  } catch {
    // Wrong key or tampered ciphertext are indistinguishable here, and both mean the
    // operator has to reconnect the account.
    throw new PublicError(
      "Stored Meta token could not be decrypted — reconnect the ad account in ERP settings",
      500,
    );
  }
}

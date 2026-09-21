import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "./crypto.ts";
import { GraphClient, GraphError } from "./graph.ts";
import { PublicError } from "./http.ts";

/**
 * Returns a Graph client built from the stored credential.
 *
 * There is intentionally one shared credential for the whole ERP rather than one per
 * staff member: ad account access is an organisational grant, and per-user tokens would
 * mean a campaign stops syncing the day whoever connected it leaves.
 */
export async function graphForAccount(db: SupabaseClient): Promise<GraphClient> {
  const { data: cred } = await db
    .from("meta_credentials")
    .select("id, access_token_cipher, access_token_iv, expires_at, is_active")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!cred) {
    throw new PublicError("No Meta account is connected yet — connect one in ERP settings", 409);
  }
  if (cred.expires_at && new Date(cred.expires_at) < new Date()) {
    throw new PublicError("The Meta connection has expired — reconnect it in ERP settings", 409);
  }

  const token = await decryptToken(cred.access_token_cipher, cred.access_token_iv);
  return new GraphClient(token);
}

/**
 * Marks the stored credential dead. Called when Graph reports the token invalid, so the
 * ERP can show "reconnect" instead of failing every sync with the same opaque error.
 */
export async function deactivateOnTokenError(db: SupabaseClient, err: unknown) {
  if (err instanceof GraphError && err.isTokenInvalid) {
    await db.from("meta_credentials").update({ is_active: false }).eq("is_active", true);
  }
}

export async function storeCredential(
  db: SupabaseClient,
  input: {
    meta_user_id: string;
    meta_user_name: string | null;
    token: string;
    expires_at: string | null;
    scopes: string[];
    created_by: string | null;
  },
) {
  const { cipher, iv } = await encryptToken(input.token);
  const { error } = await db.from("meta_credentials").upsert(
    {
      meta_user_id: input.meta_user_id,
      meta_user_name: input.meta_user_name,
      access_token_cipher: cipher,
      access_token_iv: iv,
      expires_at: input.expires_at,
      scopes: input.scopes,
      is_active: true,
      created_by: input.created_by,
    },
    { onConflict: "meta_user_id" },
  );
  if (error) throw new PublicError(`Could not store the Meta credential: ${error.message}`, 500);
}

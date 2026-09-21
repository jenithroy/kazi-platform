import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "./http.ts";

/**
 * Service-role client. Bypasses RLS, so it is the only thing that can write the meta_*
 * tables or read meta_credentials. Never hand this client (or its key) to anything that
 * takes its instructions from the request body.
 */
export function serviceClient(): SupabaseClient {
  return createClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

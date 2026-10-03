// Request plumbing shared by the outreach edge functions.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Full database access, for the worker's bookkeeping and the credentials table. Server-side only. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type Staff = { id: string; email: string; isAdmin: boolean; client: SupabaseClient };

/** The signed-in caller, if they're staff; otherwise a 401/403. */
export async function requireStaff(req: Request): Promise<Staff> {
  const authorization = req.headers.get("Authorization") ?? "";
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await client.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (userError || !userData.user) throw new HttpError(401, "Sign in again to continue.");
  const [{ data: isStaff }, { data: isAdmin }] = await Promise.all([client.rpc("is_staff"), client.rpc("is_admin")]);
  if (isStaff !== true) throw new HttpError(403, "Only staff accounts can use outreach.");
  return { id: userData.user.id, email: userData.user.email ?? "", isAdmin: isAdmin === true, client };
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message);
  return String(error);
}

/** Throws a Supabase/PostgREST error, so `const { data } = check(await …)` reads cleanly. */
export function check<T>(result: { data: T; error: unknown }): { data: T } {
  if (result.error) throw new Error(errorMessage(result.error));
  return result;
}

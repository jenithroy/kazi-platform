import type { SupabaseClient } from "@supabase/supabase-js";
import { PublicError, requireEnv } from "./http.ts";

export type Actor = { id: string; email: string; role: "customer" | "employee" | "admin" };

/**
 * Resolves the caller from their Supabase session JWT and their ERP role from `profiles`.
 *
 * The role is read with the service client on purpose: it must not be something the
 * caller can influence, and reading it through the caller's own RLS would mean trusting
 * whatever policy happens to be on profiles today.
 */
export async function requireStaff(
  req: Request,
  db: SupabaseClient,
  opts: { admin?: boolean } = {},
): Promise<Actor> {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) throw new PublicError("Missing authorization header", 401);

  // Rejects the anon key itself being passed as a bearer token, which has no user.
  const { data: userData, error } = await db.auth.getUser(token);
  if (error || !userData?.user) throw new PublicError("Not signed in", 401);

  const { data: profile } = await db
    .from("profiles")
    .select("id, email, role")
    .eq("id", userData.user.id)
    .single();

  if (!profile) throw new PublicError("No ERP profile for this account", 403);
  if (!["employee", "admin"].includes(profile.role)) {
    throw new PublicError("Marketing tools are limited to staff accounts", 403);
  }
  if (opts.admin && profile.role !== "admin") {
    throw new PublicError("This action is limited to administrators", 403);
  }
  return profile as Actor;
}

/**
 * Scheduled syncs have no user. They authenticate with a shared secret in
 * `x-meta-cron-secret` instead, compared in constant time.
 */
export function isScheduledCall(req: Request): boolean {
  const provided = req.headers.get("x-meta-cron-secret");
  if (!provided) return false;
  const expected = requireEnv("META_CRON_SECRET");
  if (provided.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function writeAuditLog(
  db: SupabaseClient,
  entry: {
    user_id: string | null;
    action: string;
    resource: string;
    resource_id?: string | null;
    details?: Record<string, unknown>;
  },
) {
  // Audit logging must never be the reason an action fails, so failures are logged and
  // swallowed rather than propagated.
  const { error } = await db.from("audit_logs").insert(entry);
  if (error) console.error("audit log insert failed", error);
}

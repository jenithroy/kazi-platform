// Supabase Edge Function: unsubscribe links in outreach emails.
//
//   GET  ?t=<token>  → { email } (masked), for the confirmation page at /unsubscribe/
//   POST ?t=<token>  → adds the prospect to the do-not-contact list. Mail apps call this
//                      directly for one-click unsubscribe (RFC 8058), so it needs no session:
//                      JWT verification is off for it (supabase/config.toml) and the token's
//                      signature is the only credential.

import { prospectFromUnsubscribeToken } from "../_shared/outreach/crypto.ts";
import { check, corsHeaders, errorMessage, json, serviceClient } from "../_shared/outreach/http.ts";

function mask(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 1)}${"•".repeat(Math.max(2, Math.min(local.length - 1, 6)))}@${domain}`;
}

async function tokenFrom(req: Request): Promise<string> {
  const fromQuery = new URL(req.url).searchParams.get("t");
  if (fromQuery || req.method !== "POST") return fromQuery ?? "";
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    return String(body.t ?? "");
  }
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (!["GET", "POST"].includes(req.method)) return json({ error: "Method not allowed" }, 405);

  try {
    const prospectId = await prospectFromUnsubscribeToken(await tokenFrom(req));
    if (!prospectId) return json({ error: "This unsubscribe link isn't valid." }, 404);

    const db = serviceClient();
    const { data: prospect } = check(
      await db.from("outreach_prospects").select("id, email, status").eq("id", prospectId).maybeSingle(),
    );
    // A deleted prospect has nothing left to stop; say so plainly rather than erroring.
    if (!prospect) return json({ ok: true, email: null });
    if (req.method === "GET") return json({ email: mask(prospect.email), unsubscribed: prospect.status === "unsubscribed" });

    check(
      await db
        .from("outreach_suppressions")
        .upsert({ value: prospect.email, reason: "unsubscribed", note: "Unsubscribe link" }, { onConflict: "value", ignoreDuplicates: true }),
    );
    // The list entry may already have existed for another reason; record the request anyway.
    check(await db.from("outreach_prospects").update({ status: "unsubscribed" }).eq("id", prospect.id).neq("status", "customer"));
    check(
      await db
        .from("outreach_enrollments")
        .update({ status: "unsubscribed", status_detail: "Unsubscribed with the link" })
        .eq("prospect_id", prospect.id)
        .in("status", ["active", "paused", "error"]),
    );
    return json({ ok: true, email: mask(prospect.email) });
  } catch (error) {
    console.error(error);
    return json({ error: errorMessage(error) }, 500);
  }
});

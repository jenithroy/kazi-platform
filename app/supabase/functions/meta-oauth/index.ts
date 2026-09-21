// OAuth connect flow for the Meta Ads module.
//
// The ERP frontend is a static export, so it cannot hold the Meta app secret or perform
// the code exchange itself. The browser only ever carries the short-lived `code`; this
// function does the exchange, upgrades the result to a long-lived token, encrypts it and
// records which ad accounts it can reach.

import { requireStaff, writeAuditLog } from "../_shared/auth.ts";
import { serviceClient } from "../_shared/db.ts";
import { GraphClient } from "../_shared/graph.ts";
import { handler, json, PublicError, requireEnv } from "../_shared/http.ts";
import { graphForAccount, storeCredential } from "../_shared/tokens.ts";

const SCOPES = ["ads_read", "ads_management", "business_management"];

type AdAccount = {
  id: string;
  account_id: string;
  name?: string;
  currency?: string;
  timezone_name?: string;
  account_status?: number;
  business?: { name?: string };
};

/**
 * The redirect URI is attacker-controllable input (it comes from the request body), and a
 * mismatched one is how authorization codes get leaked to another origin. Only origins on
 * the ALLOWED_ORIGINS allowlist, on the module's own callback path, are accepted.
 */
function assertAllowedRedirect(redirectUri: string) {
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((o) => o.trim()).filter(Boolean);
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    throw new PublicError("Invalid redirect URI", 400);
  }
  if (allowed.length && !allowed.includes(url.origin)) {
    throw new PublicError("Redirect URI origin is not allowed", 400);
  }
  if (!url.pathname.startsWith("/erp/marketing/meta-ads/connect")) {
    throw new PublicError("Redirect URI must be the module's connect callback", 400);
  }
}

async function upsertAdAccounts(
  db: ReturnType<typeof serviceClient>,
  graph: GraphClient,
  actorId: string,
) {
  const accounts = await graph.all<AdAccount>("me/adaccounts", {
    fields: "account_id,name,currency,timezone_name,account_status,business{name}",
  });

  if (!accounts.length) return [];

  const rows = accounts.map((a) => ({
    // Graph's `id` is already the `act_<id>` form the other edges expect.
    account_id: a.id,
    name: a.name ?? a.account_id,
    business_name: a.business?.name ?? null,
    currency: a.currency ?? "USD",
    timezone_name: a.timezone_name ?? null,
    account_status: a.account_status ?? null,
    connected_by: actorId,
  }));

  const { error } = await db.from("meta_ad_accounts").upsert(rows, { onConflict: "account_id" });
  if (error) throw new PublicError(`Could not save ad accounts: ${error.message}`, 500);

  // First account connected becomes the ERP default so the dashboard has something to
  // show without an extra setup step.
  const { count } = await db
    .from("meta_ad_accounts")
    .select("account_id", { count: "exact", head: true })
    .eq("is_default", true);
  if (!count) {
    await db.from("meta_ad_accounts").update({ is_default: true }).eq("account_id", rows[0].account_id);
  }

  return rows;
}

Deno.serve(handler(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method !== "POST") throw new PublicError("Use POST", 405);

  const db = serviceClient();
  // Connecting or disconnecting an ad account is an admin-only act: it decides which
  // budget the whole ERP can spend.
  const actor = await requireStaff(req, db, { admin: true });
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "authorize_url") {
    const redirectUri = String(body.redirect_uri ?? "");
    assertAllowedRedirect(redirectUri);
    const state = String(body.state ?? "");
    if (state.length < 16) throw new PublicError("A state value of at least 16 chars is required", 400);

    const url = new URL("https://www.facebook.com/v23.0/dialog/oauth");
    url.searchParams.set("client_id", requireEnv("META_APP_ID"));
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", SCOPES.join(","));
    url.searchParams.set("response_type", "code");
    return json({ url: url.toString() }, 200, origin);
  }

  if (action === "exchange") {
    const code = String(body.code ?? "");
    const redirectUri = String(body.redirect_uri ?? "");
    if (!code) throw new PublicError("Missing authorization code", 400);
    assertAllowedRedirect(redirectUri);

    const appId = requireEnv("META_APP_ID");
    const appSecret = requireEnv("META_APP_SECRET");

    // Step 1 — code for a short-lived (~1 hour) user token.
    const short = await new GraphClient("").request<{ access_token: string }>("oauth/access_token", {
      params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri, code },
    });

    // Step 2 — upgrade it to a ~60 day token. Without this the connection dies within the
    // hour and every sync after that fails.
    const long = await new GraphClient("").request<{ access_token: string; expires_in?: number }>(
      "oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: short.access_token,
        },
      },
    );

    const graph = new GraphClient(long.access_token);
    const me = await graph.request<{ id: string; name?: string }>("me", { params: { fields: "id,name" } });

    await storeCredential(db, {
      meta_user_id: me.id,
      meta_user_name: me.name ?? null,
      token: long.access_token,
      // Graph omits expires_in for never-expiring system user tokens.
      expires_at: long.expires_in
        ? new Date(Date.now() + long.expires_in * 1000).toISOString()
        : null,
      scopes: SCOPES,
      created_by: actor.id,
    });

    const accounts = await upsertAdAccounts(db, graph, actor.id);

    await writeAuditLog(db, {
      user_id: actor.id,
      action: "meta_ads.connect",
      resource: "meta_credentials",
      resource_id: me.id,
      details: { accounts: accounts.map((a) => a.account_id) },
    });

    return json({ connected_as: me.name ?? me.id, accounts }, 200, origin);
  }

  if (action === "refresh_accounts") {
    const graph = await graphForAccount(db);
    const accounts = await upsertAdAccounts(db, graph, actor.id);
    return json({ accounts }, 200, origin);
  }

  if (action === "disconnect") {
    // The credential is deactivated but the synced campaign/insight history stays: it is
    // the ERP's own reporting record, and deleting it would erase historical spend from
    // every past month's numbers.
    await db.from("meta_credentials").update({ is_active: false }).eq("is_active", true);
    await writeAuditLog(db, {
      user_id: actor.id,
      action: "meta_ads.disconnect",
      resource: "meta_credentials",
      details: {},
    });
    return json({ disconnected: true }, 200, origin);
  }

  throw new PublicError(`Unknown action "${action}"`, 400);
}));

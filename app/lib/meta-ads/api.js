"use client";

// Data access for the Meta Ads module.
//
// Reads go straight to Postgres through Supabase: the ERP has already mirrored everything
// it needs, so a dashboard load costs one query instead of a dozen rate-limited Graph
// calls. Writes and syncs go through the edge functions, which are the only things holding
// the Meta token.

import { supabase } from "@/lib/supabase";

// PostgREST caps a response at 1,000 rows. Ad-level insights over 90 days blow past that
// easily, and a silently truncated result is a wrong dashboard, so every list read pages.
const PAGE_SIZE = 1000;

async function fetchAllRows(build) {
  const rows = [];
  for (let page = 0; ; page++) {
    const from = page * PAGE_SIZE;
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
    // A guard rather than a limit anyone should hit: 50k rows means something upstream is
    // wrong, and looping forever would hang the tab.
    if (page > 49) return rows;
  }
}

/** How old a sync can get before the UI stops presenting it as current. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export async function listAdAccounts() {
  const { data, error } = await supabase
    .from("meta_ad_accounts")
    .select("*")
    .order("is_default", { ascending: false })
    .order("name");
  if (error) throw new Error(error.message);
  // Staleness is decided here rather than in a component: reading the clock during render is
  // impure, and this is the moment the data was actually fetched.
  return (data ?? []).map((account) => ({
    ...account,
    stale: !account.last_synced_at || Date.now() - Date.parse(account.last_synced_at) > STALE_AFTER_MS,
  }));
}

export async function setDefaultAccount(accountId) {
  // Two statements because the partial unique index allows only one default row: the old
  // one has to be cleared before the new one is set, or the second update trips the index.
  const { error: clearError } = await supabase
    .from("meta_ad_accounts")
    .update({ is_default: false })
    .eq("is_default", true)
    .neq("account_id", accountId);
  if (clearError) throw new Error(clearError.message);

  const { error } = await supabase
    .from("meta_ad_accounts")
    .update({ is_default: true })
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);
}

export function fetchInsights({ accountId, level = "campaign", since, until, entityIds }) {
  return fetchAllRows(() => {
    let query = supabase
      .from("meta_insights_daily")
      .select("*")
      .eq("account_id", accountId)
      .eq("level", level)
      .gte("date", since)
      .lte("date", until)
      .order("date");
    if (entityIds?.length) query = query.in("entity_id", entityIds);
    return query;
  });
}

export function fetchCampaigns(accountId) {
  return fetchAllRows(() =>
    supabase.from("meta_campaigns").select("*").eq("account_id", accountId).order("created_time", { ascending: false }),
  );
}

export function fetchAdsets(accountId, campaignId) {
  return fetchAllRows(() => {
    let query = supabase.from("meta_adsets").select("*").eq("account_id", accountId).order("name");
    if (campaignId) query = query.eq("campaign_id", campaignId);
    return query;
  });
}

export function fetchAds(accountId, { campaignId, adsetId } = {}) {
  return fetchAllRows(() => {
    let query = supabase.from("meta_ads").select("*").eq("account_id", accountId).order("name");
    if (campaignId) query = query.eq("campaign_id", campaignId);
    if (adsetId) query = query.eq("adset_id", adsetId);
    return query;
  });
}

export async function fetchSyncRuns(accountId, limit = 10) {
  let query = supabase.from("meta_sync_runs").select("*").order("started_at", { ascending: false }).limit(limit);
  if (accountId) query = query.eq("account_id", accountId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Campaign spend joined against the quotes and orders it produced (migration 008). */
export async function fetchCampaignRoi({ accountId, since, until }) {
  const { data, error } = await supabase.rpc("meta_campaign_roi", {
    date_from: since,
    date_to: until,
    p_account_id: accountId ?? null,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Quote rows attributed to Meta in the window, for the attribution detail table. */
export async function fetchAttributedQuotes({ since, until }) {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, created_at, contact_name, company_name, product_type, quantity, status, quoted_price, utm_source, utm_medium, utm_campaign, utm_content, meta_campaign_id, landing_path",
    )
    .gte("created_at", `${since}T00:00:00Z`)
    .lte("created_at", `${until}T23:59:59Z`)
    // Either the ad carried the campaign id, or the visitor arrived with Meta utm tags.
    .or("meta_campaign_id.not.is.null,utm_source.in.(facebook,instagram,meta,fb,ig)")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Edge functions
// ---------------------------------------------------------------------------

async function invoke(name, body) {
  // supabase-js attaches the signed-in user's JWT, which is what the functions check the
  // ERP role against.
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    // The FunctionsHttpError body carries the human-readable reason the function refused;
    // without reading it the UI would only ever show "non-2xx status code".
    let message = error.message;
    try {
      const payload = await error.context?.json();
      if (payload?.error) message = payload.error;
    } catch {
      // response wasn't JSON — keep the transport-level message
    }
    throw new Error(message);
  }
  return data;
}

/**
 * Where Meta sends the operator back after they approve access. It has to be byte-identical
 * in the authorize call and the code exchange or Meta rejects the exchange — hence one helper
 * rather than the string written out twice. The trailing slash matches `trailingSlash: true`
 * in next.config.mjs; without it the static host redirects and the query string is lost.
 */
export function connectRedirectUri() {
  return `${window.location.origin}/erp/marketing/meta-ads/connect/`;
}

export function startOAuth({ redirectUri, state }) {
  return invoke("meta-oauth", { action: "authorize_url", redirect_uri: redirectUri, state });
}

export function completeOAuth({ code, redirectUri }) {
  return invoke("meta-oauth", { action: "exchange", code, redirect_uri: redirectUri });
}

export function refreshAdAccounts() {
  return invoke("meta-oauth", { action: "refresh_accounts" });
}

export function disconnectMeta() {
  return invoke("meta-oauth", { action: "disconnect" });
}

export function syncNow({ accountId, days, levels } = {}) {
  return invoke("meta-sync", { account_id: accountId, days, levels });
}

export function setEntityStatus({ level, id, status }) {
  return invoke("meta-actions", { op: "set_status", level, id, status });
}

export function setEntityBudget({ level, id, field = "daily_budget", amount, acknowledgeLargeChange }) {
  return invoke("meta-actions", {
    op: "set_budget",
    level,
    id,
    field,
    amount,
    acknowledge_large_change: acknowledgeLargeChange,
  });
}

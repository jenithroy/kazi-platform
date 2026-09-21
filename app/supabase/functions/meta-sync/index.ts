// Pulls the Meta ad hierarchy and daily insights into the ERP database.
//
// Runs both on demand (an operator pressing "Sync now") and on a schedule. Everything is
// an upsert keyed on Meta's own ids, so re-running a window is safe and is in fact
// expected: Meta keeps revising the last few days of spend and conversion figures after
// the fact, so the scheduled job deliberately re-pulls a trailing window rather than only
// yesterday.

import { isScheduledCall, requireStaff, type Actor } from "../_shared/auth.ts";
import { serviceClient } from "../_shared/db.ts";
import { fromMinorUnits, type GraphClient } from "../_shared/graph.ts";
import { handler, json, PublicError } from "../_shared/http.ts";
import { INSIGHT_FIELDS, normaliseInsight, type RawInsight } from "../_shared/insights.ts";
import { deactivateOnTokenError, graphForAccount } from "../_shared/tokens.ts";

type Db = ReturnType<typeof serviceClient>;

const ENTITY_FIELDS = {
  campaigns:
    "id,name,objective,status,effective_status,buying_type,bid_strategy,daily_budget,lifetime_budget,budget_remaining,spend_cap,special_ad_categories,start_time,stop_time,created_time,updated_time",
  adsets:
    "id,campaign_id,name,status,effective_status,optimization_goal,billing_event,bid_amount,daily_budget,lifetime_budget,targeting,start_time,end_time,created_time,updated_time",
  ads:
    "id,adset_id,campaign_id,name,status,effective_status,creative{id,name,thumbnail_url,title,body,object_story_spec,call_to_action_type},created_time,updated_time",
} as const;

const LEVELS = ["account", "campaign", "adset", "ad"] as const;
type Level = (typeof LEVELS)[number];

// Insight rows are written in batches: a 90-day × 4-level sync of a busy account is tens
// of thousands of rows, and a single upsert that size times out.
const UPSERT_CHUNK = 500;

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

async function upsertChunked(db: Db, table: string, rows: unknown[], onConflict: string) {
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const { error } = await db.from(table).upsert(rows.slice(i, i + UPSERT_CHUNK), { onConflict });
    if (error) throw new PublicError(`Writing ${table} failed: ${error.message}`, 500);
  }
}

async function syncEntities(db: Db, graph: GraphClient, accountId: string) {
  const campaigns = await graph.all<Record<string, string>>(`${accountId}/campaigns`, {
    fields: ENTITY_FIELDS.campaigns,
  });
  const adsets = await graph.all<Record<string, string>>(`${accountId}/adsets`, {
    fields: ENTITY_FIELDS.adsets,
  });
  const ads = await graph.all<Record<string, unknown>>(`${accountId}/ads`, {
    fields: ENTITY_FIELDS.ads,
  });

  const campaignRows = campaigns.map((c) => ({
    id: c.id,
    account_id: accountId,
    name: c.name,
    objective: c.objective ?? null,
    status: c.status ?? null,
    effective_status: c.effective_status ?? null,
    buying_type: c.buying_type ?? null,
    bid_strategy: c.bid_strategy ?? null,
    daily_budget: fromMinorUnits(c.daily_budget),
    lifetime_budget: fromMinorUnits(c.lifetime_budget),
    budget_remaining: fromMinorUnits(c.budget_remaining),
    spend_cap: fromMinorUnits(c.spend_cap),
    special_ad_categories: c.special_ad_categories ?? [],
    start_time: c.start_time ?? null,
    stop_time: c.stop_time ?? null,
    created_time: c.created_time ?? null,
    updated_time: c.updated_time ?? null,
    synced_at: new Date().toISOString(),
  }));
  await upsertChunked(db, "meta_campaigns", campaignRows, "id");

  // Graph can return a child whose parent it did not return (a deleted or
  // permission-restricted campaign). Those children are dropped rather than allowed to
  // fail the whole sync on a foreign key violation.
  const campaignIds = new Set(campaignRows.map((c) => c.id));
  const adsetRows = adsets
    .filter((s) => campaignIds.has(s.campaign_id))
    .map((s) => ({
      id: s.id,
      campaign_id: s.campaign_id,
      account_id: accountId,
      name: s.name,
      status: s.status ?? null,
      effective_status: s.effective_status ?? null,
      optimization_goal: s.optimization_goal ?? null,
      billing_event: s.billing_event ?? null,
      bid_amount: fromMinorUnits(s.bid_amount),
      daily_budget: fromMinorUnits(s.daily_budget),
      lifetime_budget: fromMinorUnits(s.lifetime_budget),
      targeting: s.targeting ?? {},
      start_time: s.start_time ?? null,
      end_time: s.end_time ?? null,
      created_time: s.created_time ?? null,
      updated_time: s.updated_time ?? null,
      synced_at: new Date().toISOString(),
    }));
  await upsertChunked(db, "meta_adsets", adsetRows, "id");

  const adsetIds = new Set(adsetRows.map((s) => s.id));
  const adRows = ads
    .filter((a) => adsetIds.has(a.adset_id as string) && campaignIds.has(a.campaign_id as string))
    .map((a) => {
      const creative = (a.creative ?? {}) as Record<string, unknown>;
      const storySpec = (creative.object_story_spec ?? {}) as Record<string, Record<string, string>>;
      const linkData = storySpec.link_data ?? storySpec.video_data ?? {};
      return {
        id: a.id as string,
        adset_id: a.adset_id as string,
        campaign_id: a.campaign_id as string,
        account_id: accountId,
        name: a.name as string,
        status: (a.status as string) ?? null,
        effective_status: (a.effective_status as string) ?? null,
        creative_id: (creative.id as string) ?? null,
        creative_name: (creative.name as string) ?? null,
        thumbnail_url: (creative.thumbnail_url as string) ?? null,
        // Graph exposes copy in two places depending on how the ad was built: flat on the
        // creative for simple ads, nested in object_story_spec for page-post ads.
        headline: (creative.title as string) ?? linkData.name ?? null,
        body: (creative.body as string) ?? linkData.message ?? null,
        call_to_action: (creative.call_to_action_type as string) ?? null,
        destination_url: linkData.link ?? null,
        created_time: (a.created_time as string) ?? null,
        updated_time: (a.updated_time as string) ?? null,
        synced_at: new Date().toISOString(),
      };
    });
  await upsertChunked(db, "meta_ads", adRows, "id");

  return { campaigns: campaignRows.length, adsets: adsetRows.length, ads: adRows.length };
}

const ID_FIELD: Record<Level, string> = {
  account: "account_id",
  campaign: "campaign_id",
  adset: "adset_id",
  ad: "ad_id",
};
const NAME_FIELD: Record<Level, string> = {
  account: "account_name",
  campaign: "campaign_name",
  adset: "adset_name",
  ad: "ad_name",
};

async function syncInsights(
  db: Db,
  graph: GraphClient,
  accountId: string,
  currency: string,
  since: string,
  until: string,
  levels: Level[],
) {
  const counts: Record<string, number> = {};

  for (const level of levels) {
    const rows = await graph.all<RawInsight>(`${accountId}/insights`, {
      level,
      fields: `${INSIGHT_FIELDS},${ID_FIELD[level]},${NAME_FIELD[level]}`,
      // One row per entity per day. Without this Graph collapses the whole range into a
      // single row and the ERP loses every trend.
      time_increment: 1,
      time_range: JSON.stringify({ since, until }),
      // Include entities that are paused or archived now but spent during the window.
      filtering: "[]",
    }, 60);

    const normalised = rows
      .map((row) =>
        normaliseInsight(row, {
          account_id: accountId,
          level,
          entity_id: String(row[ID_FIELD[level]] ?? accountId),
          entity_name: (row[NAME_FIELD[level]] as string) ?? null,
          currency,
        })
      )
      .filter((r) => r.date);

    await upsertChunked(db, "meta_insights_daily", normalised, "level,entity_id,date");
    counts[`insights_${level}`] = normalised.length;
  }

  return counts;
}

Deno.serve(handler(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method !== "POST") throw new PublicError("Use POST", 405);

  const db = serviceClient();
  const scheduled = isScheduledCall(req);
  let actor: Actor | null = null;
  if (!scheduled) actor = await requireStaff(req, db);

  const body = await req.json().catch(() => ({}));

  // No account given means "whichever one the ERP is pointed at", which is what the
  // scheduled job always wants.
  let accountId = body.account_id as string | undefined;
  if (!accountId) {
    const { data } = await db
      .from("meta_ad_accounts")
      .select("account_id")
      .eq("is_default", true)
      .maybeSingle();
    accountId = data?.account_id;
  }
  if (!accountId) throw new PublicError("No ad account to sync — connect one first", 409);

  const { data: account } = await db
    .from("meta_ad_accounts")
    .select("account_id, currency")
    .eq("account_id", accountId)
    .maybeSingle();
  if (!account) throw new PublicError(`Unknown ad account ${accountId}`, 404);

  // A trailing window rather than a single day, because Meta restates recent spend and
  // conversions for up to ~72 hours (and longer for view-through conversions).
  const days = Math.min(Math.max(Number(body.days ?? 30), 1), 90);
  const until = body.until ? String(body.until) : ymd(new Date());
  const since = body.since
    ? String(body.since)
    : ymd(new Date(Date.parse(until) - (days - 1) * 86_400_000));

  const levels: Level[] = Array.isArray(body.levels) && body.levels.length
    ? (body.levels as Level[]).filter((l) => LEVELS.includes(l))
    : [...LEVELS];

  const { data: run } = await db
    .from("meta_sync_runs")
    .insert({
      account_id: accountId,
      kind: "full",
      trigger: scheduled ? "scheduled" : "manual",
      date_from: since,
      date_to: until,
      triggered_by: actor?.id ?? null,
    })
    .select("id")
    .single();

  try {
    const graph = await graphForAccount(db);
    const entityCounts = await syncEntities(db, graph, accountId);
    const insightCounts = await syncInsights(
      db,
      graph,
      accountId,
      account.currency ?? "USD",
      since,
      until,
      levels,
    );

    const counts = { ...entityCounts, ...insightCounts };
    await db
      .from("meta_ad_accounts")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("account_id", accountId);
    if (run) {
      await db
        .from("meta_sync_runs")
        .update({ status: "success", counts, finished_at: new Date().toISOString() })
        .eq("id", run.id);
    }

    return json({ account_id: accountId, since, until, counts }, 200, origin);
  } catch (err) {
    // An expired or revoked token is recorded on the credential so the UI can prompt for a
    // reconnect instead of showing the same failure every hour.
    await deactivateOnTokenError(db, err);
    const message = err instanceof Error ? err.message : String(err);
    if (run) {
      await db
        .from("meta_sync_runs")
        .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
        .eq("id", run.id);
    }
    throw err;
  }
}));

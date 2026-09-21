// Normalises Graph's insights payload into the flat daily row the ERP stores.

type Action = { action_type: string; value?: string };

/**
 * Graph reports conversions as an untyped `actions` array whose action_type depends on how
 * the pixel and the CTA were configured — a lead can arrive as any of these. They are
 * summed rather than picked so a single account using two of them doesn't silently report
 * half its leads.
 */
const ACTION_GROUPS: Record<string, string[]> = {
  leads: ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"],
  purchases: ["purchase", "offsite_conversion.fb_pixel_purchase", "onsite_conversion.purchase"],
  add_to_carts: ["add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"],
  initiated_checkouts: ["initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"],
  messaging_conversations: ["onsite_conversion.messaging_conversation_started_7d"],
  post_engagements: ["post_engagement"],
  video_views: ["video_view"],
  link_clicks: ["link_click"],
  landing_page_views: ["landing_page_view"],
};

const VALUE_GROUPS: Record<string, string[]> = {
  purchase_value: ["purchase", "offsite_conversion.fb_pixel_purchase", "onsite_conversion.purchase"],
};

function sumActions(actions: Action[] | undefined, types: string[]): number {
  if (!actions?.length) return 0;
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((total, a) => total + (Number(a.value) || 0), 0);
}

export type RawInsight = Record<string, unknown> & {
  date_start?: string;
  actions?: Action[];
  action_values?: Action[];
};

export function normaliseInsight(
  row: RawInsight,
  ctx: { account_id: string; level: string; entity_id: string; entity_name?: string | null; currency: string },
) {
  const num = (k: string) => Number(row[k] ?? 0) || 0;
  const actions = row.actions;

  return {
    account_id: ctx.account_id,
    level: ctx.level,
    entity_id: ctx.entity_id,
    entity_name: ctx.entity_name ?? null,
    date: row.date_start,
    currency: ctx.currency,

    impressions: num("impressions"),
    reach: num("reach"),
    clicks: num("clicks"),
    unique_clicks: num("unique_clicks"),
    // `inline_link_clicks` is the direct field; the action type is the fallback for
    // accounts where Graph omits it.
    link_clicks: num("inline_link_clicks") || sumActions(actions, ACTION_GROUPS.link_clicks),
    landing_page_views: sumActions(actions, ACTION_GROUPS.landing_page_views),
    spend: num("spend"),

    leads: sumActions(actions, ACTION_GROUPS.leads),
    purchases: sumActions(actions, ACTION_GROUPS.purchases),
    purchase_value: sumActions(row.action_values, VALUE_GROUPS.purchase_value),
    add_to_carts: sumActions(actions, ACTION_GROUPS.add_to_carts),
    initiated_checkouts: sumActions(actions, ACTION_GROUPS.initiated_checkouts),
    messaging_conversations: sumActions(actions, ACTION_GROUPS.messaging_conversations),
    post_engagements: sumActions(actions, ACTION_GROUPS.post_engagements),
    video_views: sumActions(actions, ACTION_GROUPS.video_views),

    actions: actions ?? [],
    action_values: row.action_values ?? [],
    synced_at: new Date().toISOString(),
  };
}

/** Fields requested from the insights edge. Rates are not requested — the ERP derives them. */
export const INSIGHT_FIELDS = [
  "impressions",
  "reach",
  "clicks",
  "unique_clicks",
  "inline_link_clicks",
  "spend",
  "actions",
  "action_values",
].join(",");

// Metric definitions and the arithmetic behind every number the module shows.
//
// The rule this file exists to enforce: rates are never stored and never averaged. Summing
// base counts and dividing once at the end is the only way a 30-day CPC equals what the
// 30 days actually cost per click — averaging 30 daily CPCs weights a day with 3 clicks the
// same as a day with 3,000.

import { compact, decimal, integer, money, percent, ratio } from "./format";

const BASE_FIELDS = [
  "impressions",
  "reach",
  "clicks",
  "unique_clicks",
  "link_clicks",
  "landing_page_views",
  "spend",
  "leads",
  "purchases",
  "purchase_value",
  "add_to_carts",
  "initiated_checkouts",
  "messaging_conversations",
  "post_engagements",
  "video_views",
];

export function emptyTotals() {
  return BASE_FIELDS.reduce((acc, field) => ({ ...acc, [field]: 0 }), {});
}

/** Sums the base counts of a set of daily rows. */
export function sumRows(rows = []) {
  const totals = emptyTotals();
  for (const row of rows) {
    for (const field of BASE_FIELDS) totals[field] += Number(row[field] ?? 0) || 0;
  }
  return totals;
}

const div = (a, b) => (b > 0 ? a / b : null);

/**
 * Derives every rate from summed base counts.
 *
 * `reach` and therefore `frequency` are the one honest caveat: reach is de-duplicated
 * people per day, so adding it across days counts the same person once per day they saw an
 * ad. The module labels multi-day reach as an upper bound rather than pretending otherwise —
 * a de-duplicated multi-day reach can only come from Graph itself.
 */
export function derive(totals) {
  const t = totals ?? emptyTotals();
  return {
    ...t,
    ctr: div(t.clicks * 100, t.impressions),
    link_ctr: div(t.link_clicks * 100, t.impressions),
    cpc: div(t.spend, t.clicks),
    cost_per_link_click: div(t.spend, t.link_clicks),
    cpm: div(t.spend * 1000, t.impressions),
    frequency: div(t.impressions, t.reach),
    cost_per_lead: div(t.spend, t.leads),
    lead_rate: div(t.leads * 100, t.link_clicks),
    cost_per_purchase: div(t.spend, t.purchases),
    roas: div(t.purchase_value, t.spend),
  };
}

/**
 * Metric catalogue. `betterWhen` drives delta colouring — for cost metrics a rise is bad,
 * and a dashboard that paints every increase green is worse than one with no colour at all.
 */
export const METRICS = {
  spend: { label: "Spend", format: (v, c) => money(v, c), betterWhen: "any", kind: "currency" },
  impressions: { label: "Impressions", format: compact, betterWhen: "up" },
  reach: { label: "Reach", format: compact, betterWhen: "up", note: "Summed across days — an upper bound, not de-duplicated people." },
  frequency: { label: "Frequency", format: (v) => decimal(v, 2), betterWhen: "any", note: "Impressions ÷ summed reach." },
  clicks: { label: "Clicks", format: compact, betterWhen: "up" },
  link_clicks: { label: "Link clicks", format: compact, betterWhen: "up" },
  ctr: { label: "CTR", format: (v) => percent(v, 2), betterWhen: "up" },
  link_ctr: { label: "Link CTR", format: (v) => percent(v, 2), betterWhen: "up" },
  cpc: { label: "CPC", format: (v, c) => money(v, c), betterWhen: "down", kind: "currency" },
  cost_per_link_click: { label: "Cost / link click", format: (v, c) => money(v, c), betterWhen: "down", kind: "currency" },
  cpm: { label: "CPM", format: (v, c) => money(v, c), betterWhen: "down", kind: "currency" },
  leads: { label: "Leads", format: integer, betterWhen: "up" },
  cost_per_lead: { label: "Cost / lead", format: (v, c) => money(v, c), betterWhen: "down", kind: "currency" },
  lead_rate: { label: "Lead rate", format: (v) => percent(v, 1), betterWhen: "up" },
  purchases: { label: "Purchases", format: integer, betterWhen: "up" },
  purchase_value: { label: "Purchase value", format: (v, c) => money(v, c), betterWhen: "up", kind: "currency" },
  cost_per_purchase: { label: "Cost / purchase", format: (v, c) => money(v, c), betterWhen: "down", kind: "currency" },
  roas: { label: "ROAS", format: (v) => ratio(v, 2), betterWhen: "up" },
  landing_page_views: { label: "Landing page views", format: compact, betterWhen: "up" },
  post_engagements: { label: "Post engagements", format: compact, betterWhen: "up" },
  video_views: { label: "Video views", format: compact, betterWhen: "up" },
  messaging_conversations: { label: "Conversations started", format: integer, betterWhen: "up" },
};

export function formatMetric(id, value, currency) {
  const metric = METRICS[id];
  if (!metric) return value ?? "—";
  return metric.format(value, currency);
}

/** Percentage change, plus whether that direction is good for this metric. */
export function delta(id, current, previous) {
  const metric = METRICS[id];
  if (current === null || previous === null || previous === undefined || current === undefined) return null;
  // A jump from zero is a real change but has no meaningful percentage, so it is reported
  // as "new" rather than as an infinite improvement.
  if (!previous) return current ? { change: null, direction: "up", tone: "neutral", isNew: true } : null;

  const change = ((current - previous) / Math.abs(previous)) * 100;
  const direction = change >= 0 ? "up" : "down";
  const betterWhen = metric?.betterWhen ?? "any";
  let tone = "neutral";
  if (betterWhen !== "any" && Math.abs(change) >= 0.5) {
    tone = direction === betterWhen ? "good" : "bad";
  }
  return { change, direction, tone, isNew: false };
}

/** Groups daily rows by entity id and returns per-entity derived metrics. */
export function byEntity(rows = []) {
  const groups = new Map();
  for (const row of rows) {
    const key = row.entity_id;
    if (!groups.has(key)) groups.set(key, { entity_id: key, entity_name: row.entity_name, rows: [] });
    groups.get(key).rows.push(row);
  }
  return [...groups.values()].map((g) => ({
    entity_id: g.entity_id,
    entity_name: g.entity_name,
    ...derive(sumRows(g.rows)),
  }));
}

/** Fills missing days with zeros so a chart's x-axis is continuous. */
export function toSeries(rows, days, field) {
  const byDate = new Map();
  for (const row of rows) {
    const date = String(row.date).slice(0, 10);
    byDate.set(date, (byDate.get(date) ?? 0) + (Number(row[field]) || 0));
  }
  return days.map((date) => ({ date, value: byDate.get(date) ?? 0 }));
}

/**
 * A derived metric's daily series — recomputed per day from that day's base counts, since
 * the point of a CPC trend is the daily CPC, not a smoothed one.
 */
export function toDerivedSeries(rows, days, metricId) {
  const byDate = new Map();
  for (const row of rows) {
    const date = String(row.date).slice(0, 10);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(row);
  }
  return days.map((date) => {
    const dayRows = byDate.get(date) ?? [];
    const value = derive(sumRows(dayRows))[metricId];
    return { date, value: value ?? 0 };
  });
}

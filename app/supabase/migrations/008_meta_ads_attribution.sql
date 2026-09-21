-- Ties Meta ad spend to what the ERP actually cares about: quote requests and orders.
--
-- Meta reports its own conversions, but they are pixel/browser side and stop at "someone
-- submitted a form". The ERP knows which of those quotes were priced, accepted and
-- produced — so campaign ROI can be measured against real order value instead of against
-- Meta's own conversion count.

-- Landing attribution captured on the public site and carried into the quote request.
alter table public.quotes add column if not exists utm_source text;
alter table public.quotes add column if not exists utm_medium text;
alter table public.quotes add column if not exists utm_campaign text;
alter table public.quotes add column if not exists utm_content text;
alter table public.quotes add column if not exists utm_term text;
-- Set when the ad URL carries the campaign id directly (the reliable join); utm_campaign
-- is the fallback and matches on campaign name, which editors can rename at any time.
alter table public.quotes add column if not exists meta_campaign_id text;
alter table public.quotes add column if not exists meta_ad_id text;
-- Meta's click identifier. Stored for reconciliation against Ads Manager only; it is not
-- used to build a profile and is never sent anywhere else.
alter table public.quotes add column if not exists fbclid text;
alter table public.quotes add column if not exists landing_path text;
alter table public.quotes add column if not exists referrer text;

create index if not exists idx_quotes_meta_campaign on public.quotes(meta_campaign_id);
create index if not exists idx_quotes_utm_campaign on public.quotes(lower(utm_campaign));
create index if not exists idx_quotes_created_at on public.quotes(created_at desc);

-- ---------------------------------------------------------------------------
-- Campaign ROI
-- ---------------------------------------------------------------------------
-- A function rather than a view because every number here is only meaningful for a date
-- range, and a view would either have to expose all of history or hard-code a window.
--
-- Deliberately `security invoker`: it reads through the caller's RLS, so the staff-only
-- select policies on meta_* and quotes are what gate it. A customer calling this gets an
-- empty result rather than someone else's numbers.
create or replace function public.meta_campaign_roi(
  date_from date,
  date_to date,
  p_account_id text default null
)
returns table (
  campaign_id text,
  campaign_name text,
  objective text,
  effective_status text,
  currency text,
  spend numeric,
  impressions bigint,
  reach bigint,
  clicks bigint,
  link_clicks bigint,
  meta_leads bigint,
  quotes_count bigint,
  quotes_quoted_value numeric,
  orders_count bigint,
  orders_value numeric
)
language sql
stable
as $$
  with spend_by_campaign as (
    select
      i.entity_id as campaign_id,
      max(i.currency) as currency,
      sum(i.spend) as spend,
      sum(i.impressions) as impressions,
      -- Reach is de-duplicated people, so summing it across days over-counts. It is
      -- summed here for a directional figure only; the UI labels it as such.
      sum(i.reach) as reach,
      sum(i.clicks) as clicks,
      sum(i.link_clicks) as link_clicks,
      sum(i.leads) as meta_leads
    from public.meta_insights_daily i
    where i.level = 'campaign'
      and i.date between date_from and date_to
      and (p_account_id is null or i.account_id = p_account_id)
    group by i.entity_id
  ),
  -- A quote counts against a campaign when the ad URL carried its id, or failing that
  -- when utm_campaign matches the campaign name case-insensitively.
  attributed_quotes as (
    select
      c.id as campaign_id,
      count(q.id) as quotes_count,
      coalesce(sum(q.quoted_price), 0) as quotes_quoted_value
    from public.meta_campaigns c
    join public.quotes q
      on q.meta_campaign_id = c.id
      or (q.meta_campaign_id is null and lower(q.utm_campaign) = lower(c.name))
    where q.created_at::date between date_from and date_to
    group by c.id
  ),
  attributed_orders as (
    select
      c.id as campaign_id,
      count(o.id) as orders_count,
      coalesce(sum(o.total_price), 0) as orders_value
    from public.meta_campaigns c
    join public.quotes q
      on q.meta_campaign_id = c.id
      or (q.meta_campaign_id is null and lower(q.utm_campaign) = lower(c.name))
    join public.orders o on o.quote_id = q.id
    where q.created_at::date between date_from and date_to
    group by c.id
  )
  select
    c.id,
    c.name,
    c.objective,
    c.effective_status,
    coalesce(s.currency, a.currency, 'USD'),
    coalesce(s.spend, 0),
    coalesce(s.impressions, 0),
    coalesce(s.reach, 0),
    coalesce(s.clicks, 0),
    coalesce(s.link_clicks, 0),
    coalesce(s.meta_leads, 0),
    coalesce(q.quotes_count, 0),
    coalesce(q.quotes_quoted_value, 0),
    coalesce(o.orders_count, 0),
    coalesce(o.orders_value, 0)
  from public.meta_campaigns c
  join public.meta_ad_accounts a on a.account_id = c.account_id
  left join spend_by_campaign s on s.campaign_id = c.id
  left join attributed_quotes q on q.campaign_id = c.id
  left join attributed_orders o on o.campaign_id = c.id
  where (p_account_id is null or c.account_id = p_account_id)
    -- Campaigns with neither spend nor attributed demand in the window are noise.
    and (coalesce(s.spend, 0) > 0 or coalesce(q.quotes_count, 0) > 0)
  order by coalesce(s.spend, 0) desc;
$$;

revoke all on function public.meta_campaign_roi(date, date, text) from public;
grant execute on function public.meta_campaign_roi(date, date, text) to authenticated;

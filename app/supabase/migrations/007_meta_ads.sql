-- Meta (Facebook/Instagram) Ads module
--
-- The ERP mirrors the Meta Graph API into these tables rather than querying Graph on
-- every page view: Graph is rate limited per ad account, insights calls are slow, and
-- the ERP needs to join ad spend against quotes/orders, which only works if the ad data
-- lives in the same database. Writes happen exclusively through the `meta-sync` /
-- `meta-actions` edge functions using the service role; the ERP UI only ever reads.
--
-- Identifiers are Meta's own numeric IDs stored as text — they exceed bigint range in
-- places and are always treated as opaque strings by the Graph API.

-- ---------------------------------------------------------------------------
-- Connected ad accounts
-- ---------------------------------------------------------------------------
create table if not exists public.meta_ad_accounts (
  -- Graph's `act_<id>` form, used verbatim in every Graph edge path.
  account_id text primary key,
  name text,
  business_name text,
  -- Spend is stored in the account's own currency; there is no FX normalisation, so
  -- never sum spend across accounts with different currencies (see the ROI view).
  currency text not null default 'USD',
  timezone_name text,
  -- Meta's account_status: 1 = active, 2 = disabled, 3 = unsettled, etc.
  account_status integer,
  -- Exactly one row is the ERP default, enforced by the unique index below.
  is_default boolean not null default false,
  connected_by uuid references public.profiles(id) on delete set null,
  connected_at timestamptz not null default timezone('utc', now()),
  last_synced_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists meta_ad_accounts_single_default
  on public.meta_ad_accounts (is_default)
  where is_default;

-- ---------------------------------------------------------------------------
-- OAuth credentials
-- ---------------------------------------------------------------------------
-- RLS is enabled with NO policies on purpose: that denies every anon/authenticated
-- request outright, so the encrypted system user token is reachable only by the service
-- role inside the edge functions. Do not add a select policy here — an admin who can
-- read this table can spend money in the ad account from a browser console.
create table if not exists public.meta_credentials (
  id uuid primary key default gen_random_uuid(),
  -- The Meta user/system user the token belongs to.
  meta_user_id text not null unique,
  meta_user_name text,
  -- AES-256-GCM, keyed by the META_TOKEN_ENCRYPTION_KEY function secret.
  access_token_cipher text not null,
  access_token_iv text not null,
  -- Long-lived user tokens last ~60 days; system user tokens never expire (null).
  expires_at timestamptz,
  scopes text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.meta_credentials enable row level security;

-- ---------------------------------------------------------------------------
-- Campaign / ad set / ad hierarchy
-- ---------------------------------------------------------------------------
create table if not exists public.meta_campaigns (
  id text primary key,
  account_id text not null references public.meta_ad_accounts(account_id) on delete cascade,
  name text not null,
  objective text,
  -- `status` is what was requested (ACTIVE/PAUSED/ARCHIVED/DELETED); `effective_status`
  -- is what Meta actually does, which also covers review and billing states.
  status text,
  effective_status text,
  buying_type text,
  bid_strategy text,
  -- Budgets arrive from Graph in minor units (cents) and are normalised to major units
  -- on write so the UI never has to know which is which.
  daily_budget numeric(14,2),
  lifetime_budget numeric(14,2),
  budget_remaining numeric(14,2),
  spend_cap numeric(14,2),
  special_ad_categories text[] default '{}',
  start_time timestamptz,
  stop_time timestamptz,
  created_time timestamptz,
  updated_time timestamptz,
  synced_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_meta_campaigns_account on public.meta_campaigns(account_id);
create index if not exists idx_meta_campaigns_status on public.meta_campaigns(effective_status);

create table if not exists public.meta_adsets (
  id text primary key,
  campaign_id text not null references public.meta_campaigns(id) on delete cascade,
  account_id text not null references public.meta_ad_accounts(account_id) on delete cascade,
  name text not null,
  status text,
  effective_status text,
  optimization_goal text,
  billing_event text,
  bid_amount numeric(14,2),
  daily_budget numeric(14,2),
  lifetime_budget numeric(14,2),
  -- Targeting is deliberately kept as the raw Graph object: the spec is large, nested
  -- and changes often, and the ERP only renders a summary of it.
  targeting jsonb default '{}'::jsonb,
  start_time timestamptz,
  end_time timestamptz,
  created_time timestamptz,
  updated_time timestamptz,
  synced_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_meta_adsets_campaign on public.meta_adsets(campaign_id);
create index if not exists idx_meta_adsets_account on public.meta_adsets(account_id);

create table if not exists public.meta_ads (
  id text primary key,
  adset_id text not null references public.meta_adsets(id) on delete cascade,
  campaign_id text not null references public.meta_campaigns(id) on delete cascade,
  account_id text not null references public.meta_ad_accounts(account_id) on delete cascade,
  name text not null,
  status text,
  effective_status text,
  creative_id text,
  creative_name text,
  -- Thumbnails are Graph CDN URLs and expire; they are re-written on every sync.
  thumbnail_url text,
  headline text,
  body text,
  call_to_action text,
  destination_url text,
  created_time timestamptz,
  updated_time timestamptz,
  synced_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_meta_ads_adset on public.meta_ads(adset_id);
create index if not exists idx_meta_ads_campaign on public.meta_ads(campaign_id);
create index if not exists idx_meta_ads_account on public.meta_ads(account_id);

-- ---------------------------------------------------------------------------
-- Daily insights
-- ---------------------------------------------------------------------------
-- One row per (level, entity, day). Only base counts and spend are stored: every rate
-- (CTR, CPC, CPM, CPA, ROAS, frequency) is derived at read time, because rates cannot be
-- summed or averaged across days without re-weighting them, and a stored average CPC
-- silently produces wrong totals for any range other than the one it was computed for.
create table if not exists public.meta_insights_daily (
  id uuid primary key default gen_random_uuid(),
  account_id text not null references public.meta_ad_accounts(account_id) on delete cascade,
  level text not null check (level in ('account', 'campaign', 'adset', 'ad')),
  -- The account_id for level='account', otherwise the campaign/adset/ad id. Kept
  -- unconstrained by a foreign key so an insight row survives an entity being deleted
  -- in Meta — historical spend must not disappear from the ERP's reporting.
  entity_id text not null,
  entity_name text,
  date date not null,
  currency text not null default 'USD',

  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  unique_clicks bigint not null default 0,
  link_clicks bigint not null default 0,
  landing_page_views bigint not null default 0,
  spend numeric(14,4) not null default 0,

  -- Conversion counts extracted from Graph's `actions` array into columns, so the common
  -- reports don't have to unnest JSON on every query.
  leads bigint not null default 0,
  purchases bigint not null default 0,
  purchase_value numeric(14,4) not null default 0,
  add_to_carts bigint not null default 0,
  initiated_checkouts bigint not null default 0,
  messaging_conversations bigint not null default 0,
  post_engagements bigint not null default 0,
  video_views bigint not null default 0,

  -- The full arrays are kept for action types the ERP doesn't have a column for yet.
  actions jsonb default '[]'::jsonb,
  action_values jsonb default '[]'::jsonb,

  synced_at timestamptz not null default timezone('utc', now()),

  unique (level, entity_id, date)
);

create index if not exists idx_meta_insights_account_date
  on public.meta_insights_daily(account_id, level, date desc);
create index if not exists idx_meta_insights_entity
  on public.meta_insights_daily(entity_id, date desc);

-- ---------------------------------------------------------------------------
-- Sync bookkeeping
-- ---------------------------------------------------------------------------
create table if not exists public.meta_sync_runs (
  id uuid primary key default gen_random_uuid(),
  account_id text references public.meta_ad_accounts(account_id) on delete cascade,
  kind text not null check (kind in ('entities', 'insights', 'full', 'accounts')),
  trigger text not null default 'manual' check (trigger in ('manual', 'scheduled', 'oauth')),
  status text not null default 'running' check (status in ('running', 'success', 'partial', 'failed')),
  date_from date,
  date_to date,
  -- Per-entity row counts, e.g. {"campaigns": 12, "insights": 840}.
  counts jsonb not null default '{}'::jsonb,
  error text,
  triggered_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default timezone('utc', now()),
  finished_at timestamptz
);

create index if not exists idx_meta_sync_runs_started on public.meta_sync_runs(started_at desc);

-- ---------------------------------------------------------------------------
-- RLS: staff read, service role writes
-- ---------------------------------------------------------------------------
-- Helper avoids repeating the profiles sub-select in a dozen policies. `security
-- definer` + a pinned search_path so it can read profiles without recursing through
-- that table's own policies.
create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('employee', 'admin')
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer set search_path = public;

do $$
declare
  t text;
begin
  foreach t in array array[
    'meta_ad_accounts', 'meta_campaigns', 'meta_adsets',
    'meta_ads', 'meta_insights_daily', 'meta_sync_runs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "Staff can read %s" on public.%I', t, t);
    -- Read-only for staff. No insert/update/delete policies: all mutation goes through
    -- the edge functions, which hold the service role and log to audit_logs.
    execute format(
      'create policy "Staff can read %s" on public.%I for select using (public.is_staff())',
      t, t
    );
  end loop;
end $$;

-- `is_default` is the one field the ERP flips directly from the UI, so admins get a
-- narrow update path to it rather than routing a preference change through a function.
drop policy if exists "Admins can set the default ad account" on public.meta_ad_accounts;
create policy "Admins can set the default ad account"
  on public.meta_ad_accounts for update
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists on_meta_ad_accounts_updated on public.meta_ad_accounts;
create trigger on_meta_ad_accounts_updated
  before update on public.meta_ad_accounts
  for each row execute procedure public.handle_updated_at();

drop trigger if exists on_meta_credentials_updated on public.meta_credentials;
create trigger on_meta_credentials_updated
  before update on public.meta_credentials
  for each row execute procedure public.handle_updated_at();

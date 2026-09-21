# Meta Ads module

Meta (Facebook/Instagram) ads management and analytics inside the ERP, at
**ERP → Marketing → Meta Ads**.

## What it does

| Screen | Purpose |
|---|---|
| Overview | Spend, delivery and conversion KPIs for any date range, with a per-day trend for whichever metric you select, spend by campaign, and top ads. |
| Campaigns | Live controls: pause/resume campaigns, ad sets and ads; edit daily or lifetime budgets; drill from campaign to ad set to ad. |
| Attribution | Ad spend measured against the ERP's own quote requests and orders — cost per quote, quote→order rate, cost per order, and return on ad spend against real order value. |
| Settings | Connect/disconnect the Meta account, pick the default ad account, run a sync, review sync history, and copy the ad URL tracking parameters. |

## Why it is shaped this way

The site is built with `output: "export"` (static HTML on Cloudflare Pages), so there is
no Next.js server to hold a secret or proxy a request. Three consequences drive the whole
design:

1. **The Meta app secret and access token live in Supabase Edge Functions**, never in the
   frontend bundle. The browser only ever talks to those functions and to Postgres.
2. **Reads come from the ERP's own database, not from Graph.** A nightly (or manual) sync
   mirrors campaigns, ad sets, ads and daily insights into `meta_*` tables. Dashboards are
   then a single SQL query instead of a dozen rate-limited Graph calls — and, critically,
   ad spend ends up in the same database as quotes and orders, which is what makes
   attribution possible at all.
3. **The route guard is presentation only.** Anyone can load the ERP bundle; what protects
   the data is RLS (staff-only `select` on every `meta_*` table, no write policies at all)
   plus the role checks inside each function.

Rates — CTR, CPC, CPM, CPA, ROAS, frequency — are never stored. Only base counts and spend
are, and every rate is derived at read time from summed counts. Averaging stored daily
rates would weight a day with 3 clicks the same as a day with 3,000 and quietly produce
wrong totals for any range other than the one they were computed for.

## Architecture

```
public site (static)          ERP (static, /erp)
  utm capture ─────┐            │  reads  ────────────────► Postgres (RLS: staff select)
                   └─► quotes   │                              ▲
                                └─ writes/sync ──► Edge Functions ┘ (service role)
                                                      │
                                                      └──► Meta Graph API
```

| Piece | Path |
|---|---|
| Migrations | `app/supabase/migrations/007_meta_ads.sql`, `008_meta_ads_attribution.sql` |
| Edge functions | `app/supabase/functions/meta-oauth`, `meta-sync`, `meta-actions`, `_shared/` |
| Client data layer | `app/lib/meta-ads/` (`api`, `metrics`, `format`, `ranges`) |
| UI | `app/components/Erp/`, routes under `app/app/erp/` |
| Attribution capture | `app/lib/attribution.js`, `app/components/AttributionCapture.jsx` |

## Setup

### 1. Database

Run the migrations in order (Supabase SQL editor, or `supabase db push`):

```
007_meta_ads.sql             # ad accounts, credentials, hierarchy, daily insights, sync runs, RLS
008_meta_ads_attribution.sql # utm columns on quotes + the meta_campaign_roi() function
```

### 2. Meta app

In [developers.facebook.com](https://developers.facebook.com) create (or reuse) a Business
app and add **Facebook Login**:

- Permissions requested by the module: `ads_read`, `ads_management`, `business_management`.
  `ads_management` is only needed for the pause/resume and budget controls — drop it if you
  want reporting only, and the Campaigns screen will report Graph's permission error on any
  write attempt.
- Valid OAuth redirect URI: `https://<your-domain>/erp/marketing/meta-ads/connect/`
  (the trailing slash matters — the site is exported with `trailingSlash: true`).
- The app needs Advanced Access to those permissions before it works for anyone outside the
  app's own developers/testers, which means App Review.

### 3. Function secrets

```bash
supabase secrets set \
  META_APP_ID=... \
  META_APP_SECRET=... \
  META_TOKEN_ENCRYPTION_KEY="$(openssl rand -base64 32)" \
  META_CRON_SECRET="$(openssl rand -hex 32)" \
  ALLOWED_ORIGINS=https://kazimanufacturing.com
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected by the platform. Optional:
`META_GRAPH_VERSION` (defaults to `v23.0`), `META_MAX_DAILY_BUDGET` (defaults to 2000, in
the ad account's currency).

**Losing `META_TOKEN_ENCRYPTION_KEY` means the stored token can't be decrypted** — the fix
is to reconnect the account from ERP settings, which is why the failure is reported with
exactly that instruction.

### 4. Deploy the functions

```bash
supabase functions deploy meta-oauth
supabase functions deploy meta-sync
supabase functions deploy meta-actions
```

### 5. Connect and sync

1. Sign in to the ERP with an **admin** profile (`profiles.role = 'admin'`).
2. **Marketing → Meta Ads → Settings → Connect Meta account**, approve access.
3. Pick the default ad account if more than one came back.
4. **Sync now** with a 90-day window for the initial backfill.

### 6. Schedule the nightly sync

Any scheduler that can make an HTTP call will do — Supabase `pg_cron` + `pg_net`, a GitHub
Action, or Cloudflare Cron Triggers. The call is:

```
POST https://<project>.functions.supabase.co/meta-sync
x-meta-cron-secret: <META_CRON_SECRET>
content-type: application/json

{"days": 7}
```

A 7-day window rather than a single day is deliberate: Meta keeps restating recent spend
and conversion figures for roughly 72 hours (longer for view-through conversions), so
yesterday's numbers are not final. Every write is an upsert keyed on Meta's own ids, so
re-pulling a window is safe and idempotent.

### 7. Tag the ad URLs

For attribution to work, live ads need tracking parameters on their destination URL:

```
?utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{ad.name}}&kz_campaign={{campaign.id}}&kz_ad={{ad.id}}
```

`kz_campaign` gives an exact id join. Without it the ERP falls back to matching
`utm_campaign` against the campaign name, which silently breaks the moment someone renames
a campaign.

## How attribution works

`meta_campaign_roi(date_from, date_to, account_id)` (migration 008) joins each campaign's
summed daily spend against:

- **quotes** whose `meta_campaign_id` equals the campaign id, or failing that whose
  `utm_campaign` matches the campaign name case-insensitively;
- **orders** created from those quotes.

Landing parameters are captured on the public site by `lib/attribution.js` and replayed onto
the `quotes` row at submit time, because a visitor usually browses several pages between the
ad click and the form.

Caveats worth saying out loud to whoever reads these numbers:

- It is **last-click, first-touch-within-session** attribution, counted by the day the quote
  was submitted. Meta's own figures are modelled and multi-touch; the two will not agree,
  and neither is "the" truth.
- Attribution data is stored in `sessionStorage` and is **not written at all if the visitor
  rejected cookies** — in that case only parameters still present in the URL at submit time
  are used. Some attribution is therefore missing by design.
- Multi-day `reach` is a sum of daily de-duplicated reach, so it over-counts anyone who saw
  an ad on more than one day. The UI labels it as an upper bound; `frequency` inherits the
  same caveat.
- Spend is stored in the ad account's own currency with no FX conversion. Never sum spend
  across accounts billed in different currencies.

## Permissions

| Action | Required role |
|---|---|
| View any Meta Ads screen | `employee` or `admin` |
| Run a sync | `employee` or `admin` |
| Pause / resume campaign, ad set, ad | `employee` or `admin` |
| Edit a budget | `admin` |
| Connect / disconnect Meta, set default account | `admin` |

Every write through `meta-actions` and every connect/disconnect is recorded in
`audit_logs` with the actor, the entity and the before/after values.

Guard rails on budget edits: a hard ceiling (`META_MAX_DAILY_BUDGET`) and a confirmation
step for any increase over 3× the current budget. Archive and delete are deliberately not
exposed — they are effectively irreversible in Ads Manager and have no business behind a
table-row toggle.

## Operating notes

- **"No Meta account is connected"** — expected before step 5, or after a token was revoked
  in Meta. The sync marks the credential inactive when Graph reports the token invalid, so
  the UI asks for a reconnect instead of failing hourly with an opaque error.
- **A sync that fails** leaves a row in `meta_sync_runs` with the Graph error; Settings →
  Recent syncs shows the last ten.
- **Long-lived tokens last ~60 days.** For an installation nobody babysits, swap the user
  token for a Business Manager **system user** token, which doesn't expire: store it with
  the same `meta_credentials` shape (`expires_at` null) and the rest of the module is
  unchanged.
- **Ad thumbnails** are Graph CDN URLs that expire; they are re-written on each sync, and a
  dead one just renders as a blank tile.
- **Graph rate limits** are per ad account. The client retries rate-limited and 5xx
  responses with exponential backoff and caps pagination, so a very large account degrades
  into a partial sync rather than a hung function.

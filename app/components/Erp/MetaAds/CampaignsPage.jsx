"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Pause, Play } from "lucide-react";
import { useAsync } from "@/lib/erp/use-async";
import { useErpSession } from "@/lib/erp/session";
import { fetchAds, fetchAdsets, fetchCampaigns, fetchInsights, setEntityBudget, setEntityStatus } from "@/lib/meta-ads/api";
import { humanEnum, money, percent } from "@/lib/meta-ads/format";
import { byEntity, derive, emptyTotals } from "@/lib/meta-ads/metrics";
import { ErpPageHeader } from "../ErpShell";
import { Alert, Badge, Button, Card, Spinner, Table, Td, Th, Tr, inputClass } from "../Ui";
import { FilterBar, MetaAdsTabs, NotConnected, StaleDataNotice } from "./ModuleChrome";
import { useMetaAds } from "./MetaAdsProvider";

/**
 * Meta's effective_status has a dozen values and most of them mean "not running, and here is
 * why". Collapsing them to a tone plus Meta's own word keeps the table scannable without
 * hiding the reason — "In review" and "Paused" are very different problems.
 */
function statusTone(status) {
  if (status === "ACTIVE") return "active";
  if (["PAUSED", "CAMPAIGN_PAUSED", "ADSET_PAUSED"].includes(status)) return "paused";
  if (["PENDING_REVIEW", "PENDING_BILLING_INFO", "IN_PROCESS", "PREAPPROVED"].includes(status)) return "warning";
  if (["DISAPPROVED", "WITH_ISSUES"].includes(status)) return "error";
  return "neutral";
}

function StatusControl({ level, entity, onDone }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const running = entity.status === "ACTIVE";

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await setEntityStatus({ level, id: entity.id, status: running ? "PAUSED" : "ACTIVE" });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="ghost" onClick={toggle} busy={busy} title={running ? "Pause" : "Resume"}>
        {running ? <Pause size={13} aria-hidden /> : <Play size={13} aria-hidden />}
        {running ? "Pause" : "Resume"}
      </Button>
      {error && <span className="font-body text-[11px] text-red-700">{error}</span>}
    </div>
  );
}

/**
 * Inline daily-budget editor, admin only.
 *
 * The edge function refuses a jump of more than 3× with a 409 rather than a hard error; that
 * refusal is turned into a confirm step here, which is the whole point — it catches an extra
 * zero before Meta starts spending it.
 */
function BudgetControl({ level, entity, currency, canEdit, onDone }) {
  const budget = entity.daily_budget ?? entity.lifetime_budget;
  const field = entity.daily_budget != null ? "daily_budget" : "lifetime_budget";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(budget ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  if (budget == null) {
    // Campaign budget optimisation moves the budget to the campaign, so its ad sets
    // legitimately have none — saying so beats showing an empty cell.
    return <span className="font-body text-xs text-pine-soft">{level === "adset" ? "Campaign budget" : "—"}</span>;
  }

  if (!canEdit || !editing) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-body text-sm text-pine [font-variant-numeric:tabular-nums]">
          {money(budget, currency)}
        </span>
        <span className="font-body text-[10px] text-pine-soft">{field === "daily_budget" ? "daily" : "lifetime"}</span>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="font-body text-[11px] text-moss-deep hover:underline"
          >
            Edit
          </button>
        )}
      </div>
    );
  }

  async function save(acknowledge) {
    setBusy(true);
    setError(null);
    try {
      await setEntityBudget({
        level,
        id: entity.id,
        field,
        amount: Number(value),
        acknowledgeLargeChange: acknowledge,
      });
      setEditing(false);
      setNeedsConfirm(false);
      onDone();
    } catch (err) {
      setError(err.message);
      if (/confirm/i.test(err.message)) setNeedsConfirm(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input
        type="number"
        min="1"
        step="1"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setNeedsConfirm(false);
        }}
        aria-label={`${field.replace("_", " ")} in ${currency}`}
        className={`${inputClass} h-8 w-24 py-0 text-right`}
      />
      <div className="flex gap-1">
        <Button variant="primary" onClick={() => save(needsConfirm)} busy={busy}>
          {needsConfirm ? "Confirm" : "Save"}
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            setEditing(false);
            setValue(budget);
            setError(null);
            setNeedsConfirm(false);
          }}
        >
          Cancel
        </Button>
      </div>
      {error && <span className="max-w-48 text-right font-body text-[11px] text-red-700">{error}</span>}
    </div>
  );
}

const SORTS = {
  name: (a, b) => (a.name ?? "").localeCompare(b.name ?? ""),
  spend: (a, b) => a.metrics.spend - b.metrics.spend,
  link_clicks: (a, b) => a.metrics.link_clicks - b.metrics.link_clicks,
  link_ctr: (a, b) => (a.metrics.link_ctr ?? 0) - (b.metrics.link_ctr ?? 0),
  leads: (a, b) => a.metrics.leads - b.metrics.leads,
  cost_per_lead: (a, b) => (a.metrics.cost_per_lead ?? Infinity) - (b.metrics.cost_per_lead ?? Infinity),
};

/** Ad sets and ads for one expanded campaign, loaded only when it is opened. */
function CampaignChildren({ campaign, currency, canEdit, onDone }) {
  const { account, range, dataVersion } = useMetaAds();
  const accountId = account.account_id;

  const adsets = useAsync(() => fetchAdsets(accountId, campaign.id), [accountId, campaign.id, dataVersion]);
  const ads = useAsync(() => fetchAds(accountId, { campaignId: campaign.id }), [accountId, campaign.id, dataVersion]);
  const adsetInsights = useAsync(
    () => fetchInsights({ accountId, level: "adset", since: range.since, until: range.until }),
    [accountId, range.since, range.until, dataVersion],
  );
  const adInsights = useAsync(
    () => fetchInsights({ accountId, level: "ad", since: range.since, until: range.until }),
    [accountId, range.since, range.until, dataVersion],
  );

  const adsetMetrics = useMemo(
    () => new Map(byEntity(adsetInsights.data ?? []).map((m) => [m.entity_id, m])),
    [adsetInsights.data],
  );
  const adMetrics = useMemo(
    () => new Map(byEntity(adInsights.data ?? []).map((m) => [m.entity_id, m])),
    [adInsights.data],
  );

  if (adsets.loading && !adsets.data) return <Spinner label="Loading ad sets" />;

  const zero = derive(emptyTotals());

  return (
    <div className="space-y-3 bg-paper-raised/40 px-4 py-3">
      {(adsets.data ?? []).map((adset) => {
        const metrics = adsetMetrics.get(adset.id) ?? zero;
        const adsForSet = (ads.data ?? []).filter((ad) => ad.adset_id === adset.id);
        return (
          <div key={adset.id} className="rounded-sm border border-pine/12 bg-bone">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-pine/10 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate font-body text-sm font-semibold text-pine">{adset.name}</p>
                <p className="font-body text-[11px] text-pine-soft">
                  {humanEnum(adset.optimization_goal)} · {humanEnum(adset.billing_event)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge tone={statusTone(adset.effective_status)}>{humanEnum(adset.effective_status)}</Badge>
                <BudgetControl level="adset" entity={adset} currency={currency} canEdit={canEdit} onDone={onDone} />
                <StatusControl level="adset" entity={adset} onDone={onDone} />
              </div>
            </div>

            <dl className="flex flex-wrap gap-x-6 gap-y-1 px-3 py-2 font-body text-xs">
              <div className="flex gap-1.5">
                <dt className="text-pine-soft">Spend</dt>
                <dd className="font-semibold text-pine">{money(metrics.spend, currency)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-pine-soft">Link clicks</dt>
                <dd className="font-semibold text-pine">{metrics.link_clicks}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-pine-soft">Leads</dt>
                <dd className="font-semibold text-pine">{metrics.leads}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-pine-soft">Cost / lead</dt>
                <dd className="font-semibold text-pine">
                  {metrics.cost_per_lead ? money(metrics.cost_per_lead, currency) : "—"}
                </dd>
              </div>
            </dl>

            {adsForSet.length > 0 && (
              <Table
                caption={`Ads in ${adset.name}`}
                head={
                  <>
                    <Th>Ad</Th>
                    <Th align="right">Status</Th>
                    <Th align="right">Spend</Th>
                    <Th align="right">Link clicks</Th>
                    <Th align="right">Leads</Th>
                    <Th align="right" />
                  </>
                }
              >
                {adsForSet.map((ad) => {
                  const adMetric = adMetrics.get(ad.id) ?? zero;
                  return (
                    <Tr key={ad.id}>
                      <Td>
                        <span className="block truncate font-body text-sm text-pine">{ad.name}</span>
                        {ad.headline && (
                          <span className="block truncate font-body text-[11px] text-pine-soft">{ad.headline}</span>
                        )}
                      </Td>
                      <Td align="right">
                        <Badge tone={statusTone(ad.effective_status)}>{humanEnum(ad.effective_status)}</Badge>
                      </Td>
                      <Td numeric>{money(adMetric.spend, currency)}</Td>
                      <Td numeric>{adMetric.link_clicks}</Td>
                      <Td numeric>{adMetric.leads}</Td>
                      <Td align="right">
                        <StatusControl level="ad" entity={ad} onDone={onDone} />
                      </Td>
                    </Tr>
                  );
                })}
              </Table>
            )}
          </div>
        );
      })}
      {(adsets.data ?? []).length === 0 && (
        <p className="py-4 text-center font-body text-sm text-pine-soft">This campaign has no ad sets.</p>
      )}
    </div>
  );
}

export function MetaAdsCampaignsPage() {
  const { account, accountsLoading, currency, range, dataVersion, refreshData } = useMetaAds();
  const { isAdmin } = useErpSession();
  const [sort, setSort] = useState({ key: "spend", direction: "desc" });
  const [expanded, setExpanded] = useState(null);
  const [hideSpentNothing, setHideSpentNothing] = useState(true);

  const accountId = account?.account_id;
  const campaigns = useAsync(() => (accountId ? fetchCampaigns(accountId) : []), [accountId, dataVersion]);
  const insights = useAsync(
    () => (accountId ? fetchInsights({ accountId, level: "campaign", since: range.since, until: range.until }) : []),
    [accountId, range.since, range.until, dataVersion],
  );

  const rows = useMemo(() => {
    const metricsById = new Map(byEntity(insights.data ?? []).map((m) => [m.entity_id, m]));
    const zero = derive(emptyTotals());
    const list = (campaigns.data ?? []).map((campaign) => ({
      ...campaign,
      metrics: metricsById.get(campaign.id) ?? zero,
    }));
    // Accounts accumulate years of archived campaigns; by default only the ones that either
    // spent in this range or are currently running are worth a row.
    const filtered = hideSpentNothing
      ? list.filter((c) => c.metrics.spend > 0 || c.effective_status === "ACTIVE")
      : list;
    const sorter = SORTS[sort.key] ?? SORTS.spend;
    return filtered.sort((a, b) => (sort.direction === "asc" ? sorter(a, b) : sorter(b, a)));
  }, [campaigns.data, insights.data, sort, hideSpentNothing]);

  function toggleSort(key) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "name" ? "asc" : "desc" },
    );
  }

  const sortProps = (key) => ({
    sortable: true,
    sorted: sort.key === key ? sort.direction : undefined,
    onClick: () => toggleSort(key),
  });

  if (accountsLoading) return <Spinner label="Loading ad accounts" />;

  return (
    <>
      <ErpPageHeader
        title="Campaigns"
        description="Live campaign controls. Pausing and resuming is available to all staff; budget changes are admin-only."
        tabs={<MetaAdsTabs />}
      />

      {!account ? (
        <NotConnected />
      ) : (
        <>
          <FilterBar />
          <StaleDataNotice account={account} />

          {!isAdmin && (
            <div className="mb-4">
              <Alert tone="info">
                You can pause and resume campaigns. Budget edits need an admin account.
              </Alert>
            </div>
          )}

          {(campaigns.error || insights.error) && (
            <div className="mb-4">
              <Alert tone="error" title="Could not load campaigns">
                {campaigns.error ?? insights.error}
              </Alert>
            </div>
          )}

          <Card
            title={`${rows.length} campaign${rows.length === 1 ? "" : "s"}`}
            subtitle={`Performance shown for ${range.since} to ${range.until}`}
            bodyClassName="px-0 py-0"
            actions={
              <label className="flex items-center gap-2 font-body text-xs text-pine-soft">
                <input
                  type="checkbox"
                  checked={hideSpentNothing}
                  onChange={(e) => setHideSpentNothing(e.target.checked)}
                  className="accent-moss"
                />
                Hide campaigns with no spend in range
              </label>
            }
          >
            {campaigns.loading && !campaigns.data ? (
              <Spinner label="Loading campaigns" />
            ) : rows.length === 0 ? (
              <p className="px-5 py-10 text-center font-body text-sm text-pine-soft">
                No campaigns match. Try a wider date range, or untick the filter above.
              </p>
            ) : (
              <div className={insights.loading ? "opacity-60 transition-opacity" : ""}>
                <Table
                  caption="Campaigns with performance and controls"
                  head={
                    <>
                      <Th className="w-8" />
                      <Th {...sortProps("name")}>Campaign</Th>
                      <Th>Status</Th>
                      <Th align="right">Budget</Th>
                      <Th align="right" {...sortProps("spend")}>Spend</Th>
                      <Th align="right" {...sortProps("link_clicks")}>Link clicks</Th>
                      <Th align="right" {...sortProps("link_ctr")}>Link CTR</Th>
                      <Th align="right" {...sortProps("leads")}>Leads</Th>
                      <Th align="right" {...sortProps("cost_per_lead")}>Cost / lead</Th>
                      <Th align="right">Action</Th>
                    </>
                  }
                >
                  {rows.map((campaign) => (
                    // A fragment per campaign so the expanded detail row is a sibling of the
                    // campaign row rather than nested inside a cell that spans the table.
                    <Fragment key={campaign.id}>
                      <Tr>
                        <Td>
                          <button
                            type="button"
                            onClick={() => setExpanded(expanded === campaign.id ? null : campaign.id)}
                            aria-expanded={expanded === campaign.id}
                            aria-label={`${expanded === campaign.id ? "Hide" : "Show"} ad sets for ${campaign.name}`}
                            className="rounded-sm p-1 text-pine-soft hover:bg-pine/6 hover:text-pine"
                          >
                            {expanded === campaign.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        </Td>
                        <Td>
                          <span className="block max-w-72 truncate font-body text-sm text-pine">{campaign.name}</span>
                          <span className="block font-body text-[11px] text-pine-soft">
                            {humanEnum(campaign.objective)}
                          </span>
                        </Td>
                        <Td>
                          <Badge tone={statusTone(campaign.effective_status)}>
                            {humanEnum(campaign.effective_status)}
                          </Badge>
                        </Td>
                        <Td align="right">
                          <BudgetControl
                            level="campaign"
                            entity={campaign}
                            currency={currency}
                            canEdit={isAdmin}
                            onDone={refreshData}
                          />
                        </Td>
                        <Td numeric>{money(campaign.metrics.spend, currency)}</Td>
                        <Td numeric>{campaign.metrics.link_clicks}</Td>
                        <Td numeric>{percent(campaign.metrics.link_ctr, 2)}</Td>
                        <Td numeric>{campaign.metrics.leads}</Td>
                        <Td numeric>
                          {campaign.metrics.cost_per_lead ? money(campaign.metrics.cost_per_lead, currency) : "—"}
                        </Td>
                        <Td align="right">
                          <StatusControl level="campaign" entity={campaign} onDone={refreshData} />
                        </Td>
                      </Tr>
                      {expanded === campaign.id && (
                        <tr>
                          <td colSpan={10} className="p-0">
                            <CampaignChildren
                              campaign={campaign}
                              currency={currency}
                              canEdit={isAdmin}
                              onDone={refreshData}
                            />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </Table>
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
}

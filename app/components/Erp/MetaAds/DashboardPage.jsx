"use client";

import { useState } from "react";
import { useAsync } from "@/lib/erp/use-async";
import { fetchAds, fetchInsights } from "@/lib/meta-ads/api";
import { money, moneyAxis, percent } from "@/lib/meta-ads/format";
import { METRICS, byEntity, delta, derive, formatMetric, sumRows, toDerivedSeries, toSeries } from "@/lib/meta-ads/metrics";
import { eachDay } from "@/lib/meta-ads/ranges";
import { BarList, TimeSeriesChart } from "../Charts";
import { ErpPageHeader } from "../ErpShell";
import { StatTile } from "../StatTile";
import { Alert, Card, Spinner, Table, Td, Th, Tr } from "../Ui";
import { FilterBar, MetaAdsTabs, NotConnected, StaleDataNotice } from "./ModuleChrome";
import { useMetaAds } from "./MetaAdsProvider";

// The tiles double as the chart's metric picker: eight headline figures, and clicking one
// plots it. Cost metrics sit next to the volume metric they divide, so a rising CPL is read
// beside the lead count that caused it.
const TILE_METRICS = [
  "spend",
  "impressions",
  "link_clicks",
  "link_ctr",
  "cost_per_link_click",
  "leads",
  "cost_per_lead",
  "roas",
];

// Which metrics are a plain daily sum, and which have to be recomputed per day from that
// day's base counts.
const SUMMABLE = new Set(["spend", "impressions", "reach", "clicks", "link_clicks", "leads", "purchases", "purchase_value", "landing_page_views"]);

export function MetaAdsDashboard() {
  const { account, accountsLoading, accountsError, currency, range, comparison, dataVersion } = useMetaAds();
  const [metric, setMetric] = useState("spend");

  const accountId = account?.account_id;

  const current = useAsync(
    () => (accountId ? fetchInsights({ accountId, level: "campaign", since: range.since, until: range.until }) : []),
    [accountId, range.since, range.until, dataVersion],
  );
  const previous = useAsync(
    () =>
      accountId
        ? fetchInsights({ accountId, level: "campaign", since: comparison.since, until: comparison.until })
        : [],
    [accountId, comparison.since, comparison.until, dataVersion],
  );
  const adInsights = useAsync(
    () => (accountId ? fetchInsights({ accountId, level: "ad", since: range.since, until: range.until }) : []),
    [accountId, range.since, range.until, dataVersion],
  );
  const ads = useAsync(() => (accountId ? fetchAds(accountId) : []), [accountId, dataVersion]);

  const rows = current.data ?? [];
  const totals = derive(sumRows(rows));
  const previousTotals = derive(sumRows(previous.data ?? []));
  const days = eachDay(range);

  const chartSeries = [
    {
      id: metric,
      label: METRICS[metric]?.label ?? metric,
      points: SUMMABLE.has(metric) ? toSeries(rows, days, metric) : toDerivedSeries(rows, days, metric),
    },
  ];

  const campaigns = byEntity(rows).sort((a, b) => b.spend - a.spend);

  const adsById = new Map((ads.data ?? []).map((ad) => [ad.id, ad]));
  const topAds = byEntity(adInsights.data ?? [])
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 6)
    .map((entry) => ({ ...entry, ad: adsById.get(entry.entity_id) }));

  if (accountsLoading) return <Spinner label="Loading ad accounts" />;
  if (accountsError) {
    return (
      <Alert tone="error" title="Could not load ad accounts">
        {accountsError}
      </Alert>
    );
  }

  return (
    <>
      <ErpPageHeader
        title="Meta Ads"
        description={
          account
            ? `${account.name} · ${account.currency}${account.business_name ? ` · ${account.business_name}` : ""}`
            : undefined
        }
        tabs={<MetaAdsTabs />}
      />

      {!account ? (
        <NotConnected />
      ) : (
        <>
          <FilterBar />
          <StaleDataNotice account={account} />

          {current.error && (
            <div className="mb-4">
              <Alert tone="error" title="Could not load performance data">
                {current.error}
              </Alert>
            </div>
          )}

          {current.loading && !current.data ? (
            <Spinner label="Loading performance" />
          ) : (
            // While a new range loads the previous render stays on screen at reduced
            // opacity — no skeleton, no layout jump.
            <div className={current.loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
              <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {TILE_METRICS.map((id) => (
                  <StatTile
                    key={id}
                    label={METRICS[id].label}
                    value={formatMetric(id, totals[id], currency)}
                    delta={delta(id, totals[id], previousTotals[id])}
                    comparisonLabel={comparison.label}
                    spark={
                      SUMMABLE.has(id)
                        ? toSeries(rows, days.slice(-12), id)
                        : toDerivedSeries(rows, days.slice(-12), id)
                    }
                    onClick={() => setMetric(id)}
                    selected={metric === id}
                  />
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                <Card
                  title={`${METRICS[metric]?.label ?? metric} per day`}
                  subtitle={`${range.since} to ${range.until}. Pick a tile above to plot a different metric.`}
                >
                  <TimeSeriesChart
                    series={chartSeries}
                    formatValue={(value) => formatMetric(metric, value, currency)}
                    formatTick={(value) =>
                      METRICS[metric]?.kind === "currency"
                        ? moneyAxis(value, currency)
                        : formatMetric(metric, value, currency)
                    }
                  />
                </Card>

                <Card title="Spend by campaign" subtitle="Highest spend first">
                  <BarList
                    label="Spend"
                    items={campaigns.slice(0, 8).map((c) => ({
                      id: c.entity_id,
                      label: c.entity_name ?? c.entity_id,
                      value: c.spend,
                      secondary: `${c.leads} lead${c.leads === 1 ? "" : "s"} · ${
                        c.cost_per_lead ? `${money(c.cost_per_lead, currency)} per lead` : "no leads yet"
                      }`,
                    }))}
                    formatValue={(value) => money(value, currency)}
                    emptyMessage="No campaign spend in this range."
                  />
                </Card>
              </div>

              <div className="mt-4">
                <Card
                  title="Top ads"
                  subtitle="By spend in the selected range"
                  bodyClassName="px-0 py-0"
                >
                  {topAds.length === 0 ? (
                    <p className="px-5 py-8 text-center font-body text-sm text-pine-soft">
                      No ad-level data in this range.
                    </p>
                  ) : (
                    <Table
                      caption="Top ads by spend"
                      head={
                        <>
                          <Th>Ad</Th>
                          <Th align="right">Spend</Th>
                          <Th align="right">Link clicks</Th>
                          <Th align="right">Link CTR</Th>
                          <Th align="right">Leads</Th>
                          <Th align="right">Cost / lead</Th>
                        </>
                      }
                    >
                      {topAds.map((entry) => (
                        <Tr key={entry.entity_id}>
                          <Td>
                            <div className="flex items-center gap-2.5">
                              {entry.ad?.thumbnail_url ? (
                                // Graph CDN thumbnails are re-written on each sync and can
                                // expire; a plain img keeps a dead URL from breaking layout,
                                // and next/image is unavailable under the static export's
                                // unoptimized config anyway.
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={entry.ad.thumbnail_url}
                                  alt=""
                                  width={36}
                                  height={36}
                                  className="h-9 w-9 shrink-0 rounded-sm border border-pine/10 object-cover"
                                />
                              ) : (
                                <span className="h-9 w-9 shrink-0 rounded-sm bg-pine/6" aria-hidden />
                              )}
                              <span className="min-w-0">
                                <span className="block truncate font-body text-sm text-pine">
                                  {entry.entity_name ?? entry.entity_id}
                                </span>
                                {entry.ad?.headline && (
                                  <span className="block truncate font-body text-[11px] text-pine-soft">
                                    {entry.ad.headline}
                                  </span>
                                )}
                              </span>
                            </div>
                          </Td>
                          <Td numeric>{money(entry.spend, currency)}</Td>
                          <Td numeric>{entry.link_clicks}</Td>
                          <Td numeric>{percent(entry.link_ctr, 2)}</Td>
                          <Td numeric>{entry.leads}</Td>
                          <Td numeric>{entry.cost_per_lead ? money(entry.cost_per_lead, currency) : "—"}</Td>
                        </Tr>
                      ))}
                    </Table>
                  )}
                </Card>
              </div>

              {METRICS[metric]?.note && (
                <p className="mt-3 font-body text-xs text-pine-soft">{METRICS[metric].note}</p>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}

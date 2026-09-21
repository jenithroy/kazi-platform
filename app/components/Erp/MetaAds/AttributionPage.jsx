"use client";

import { useAsync } from "@/lib/erp/use-async";
import { fetchAttributedQuotes, fetchCampaignRoi, fetchInsights } from "@/lib/meta-ads/api";
import { humanEnum, longDate, money, percent, ratio } from "@/lib/meta-ads/format";
import { derive, sumRows, toSeries } from "@/lib/meta-ads/metrics";
import { eachDay } from "@/lib/meta-ads/ranges";
import { TimeSeriesChart } from "../Charts";
import { ErpPageHeader } from "../ErpShell";
import { StatTile } from "../StatTile";
import { Alert, Badge, Card, Spinner, Table, Td, Th, Tr } from "../Ui";
import { FilterBar, MetaAdsTabs, NotConnected } from "./ModuleChrome";
import { useMetaAds } from "./MetaAdsProvider";

const QUOTE_STATUS_TONE = { pending: "neutral", quoted: "warning", accepted: "active", rejected: "error" };

/**
 * Where the module earns its place in an ERP rather than in Ads Manager.
 *
 * Meta can tell you it delivered 40 leads. Only the ERP knows that 31 of them asked for a
 * real quote, 6 became orders, and what those orders were worth — so cost per *order* and
 * return on ad spend against actual revenue are computable here and nowhere else.
 */
export function MetaAdsAttributionPage() {
  const { account, accountsLoading, currency, range, comparison, dataVersion } = useMetaAds();
  const accountId = account?.account_id;

  const insights = useAsync(
    () => (accountId ? fetchInsights({ accountId, level: "campaign", since: range.since, until: range.until }) : []),
    [accountId, range.since, range.until, dataVersion],
  );
  const previousInsights = useAsync(
    () =>
      accountId
        ? fetchInsights({ accountId, level: "campaign", since: comparison.since, until: comparison.until })
        : [],
    [accountId, comparison.since, comparison.until, dataVersion],
  );
  const roi = useAsync(
    () => (accountId ? fetchCampaignRoi({ accountId, since: range.since, until: range.until }) : []),
    [accountId, range.since, range.until, dataVersion],
  );
  const quotes = useAsync(
    () => fetchAttributedQuotes({ since: range.since, until: range.until }),
    [range.since, range.until, dataVersion],
  );

  const totals = derive(sumRows(insights.data ?? []));
  const previousTotals = derive(sumRows(previousInsights.data ?? []));
  const days = eachDay(range);

  const roiRows = roi.data ?? [];
  const quoteRows = quotes.data ?? [];

  const quotesCount = roiRows.reduce((sum, r) => sum + Number(r.quotes_count ?? 0), 0);
  const ordersCount = roiRows.reduce((sum, r) => sum + Number(r.orders_count ?? 0), 0);
  const ordersValue = roiRows.reduce((sum, r) => sum + Number(r.orders_value ?? 0), 0);
  const erp = {
    spend: totals.spend,
    quotesCount,
    ordersCount,
    ordersValue,
    costPerQuote: quotesCount > 0 ? totals.spend / quotesCount : null,
    costPerOrder: ordersCount > 0 ? totals.spend / ordersCount : null,
    quoteToOrder: quotesCount > 0 ? (ordersCount / quotesCount) * 100 : null,
    returnOnSpend: totals.spend > 0 ? ordersValue / totals.spend : null,
  };

  // Meta's lead count and the ERP's quote count are both daily counts of people, so they
  // share a scale and belong on one chart. Spend would not — a second y-axis is never the
  // answer, so spend lives on the Overview tab's own chart instead.
  const quotesByDate = new Map();
  for (const quote of quoteRows) {
    const date = String(quote.created_at).slice(0, 10);
    quotesByDate.set(date, (quotesByDate.get(date) ?? 0) + 1);
  }
  const demandSeries = [
    { id: "meta_leads", label: "Meta-reported leads", points: toSeries(insights.data ?? [], days, "leads") },
    {
      id: "erp_quotes",
      label: "Quote requests in the ERP",
      points: days.map((date) => ({ date, value: quotesByDate.get(date) ?? 0 })),
    },
  ];

  if (accountsLoading) return <Spinner label="Loading ad accounts" />;

  return (
    <>
      <ErpPageHeader
        title="Attribution"
        description="Ad spend measured against the quote requests and orders it actually produced."
        tabs={<MetaAdsTabs />}
      />

      {!account ? (
        <NotConnected />
      ) : (
        <>
          <FilterBar />

          <div className="mb-5">
            <Alert tone="info" title="How a quote gets attributed">
              A quote is credited to a campaign when the ad&rsquo;s destination URL carried{" "}
              <code className="font-mono text-xs">kz_campaign=&#123;&#123;campaign.id&#125;&#125;</code>, or failing
              that when its <code className="font-mono text-xs">utm_campaign</code> matches the campaign name.
              Quotes are counted by the day they were submitted, so a click late in the range that converts after
              it lands in the next period — this is last-click attribution, not Meta&rsquo;s modelled view, and the
              two will not agree exactly.
            </Alert>
          </div>

          {(roi.error || quotes.error) && (
            <div className="mb-4">
              <Alert tone="error" title="Could not load attribution data">
                {roi.error ?? quotes.error}
              </Alert>
            </div>
          )}

          <div className={roi.loading && roi.data ? "opacity-60 transition-opacity" : ""}>
            <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatTile
                label="Spend"
                value={money(erp.spend, currency)}
                delta={null}
                note={`vs ${money(previousTotals.spend, currency)} in the ${comparison.label}`}
              />
              <StatTile label="Quote requests" value={erp.quotesCount} note="Attributed to Meta campaigns" />
              <StatTile
                label="Cost per quote"
                value={erp.costPerQuote ? money(erp.costPerQuote, currency) : "—"}
                note="Spend ÷ attributed quotes"
              />
              <StatTile
                label="Quote → order"
                value={erp.quoteToOrder !== null ? percent(erp.quoteToOrder, 1) : "—"}
                note="Attributed quotes that became orders"
              />
              <StatTile label="Orders won" value={erp.ordersCount} note="From attributed quotes" />
              <StatTile label="Order value" value={money(erp.ordersValue, currency)} note="Total of those orders" />
              <StatTile
                label="Cost per order"
                value={erp.costPerOrder ? money(erp.costPerOrder, currency) : "—"}
                note="Spend ÷ attributed orders"
              />
              <StatTile
                label="Return on ad spend"
                value={erp.returnOnSpend !== null ? ratio(erp.returnOnSpend, 2) : "—"}
                note="Order value ÷ spend"
              />
            </div>

            <Card
              title="Demand per day"
              subtitle="Meta's own lead count next to the quote requests that reached the ERP"
              className="mb-4"
            >
              <TimeSeriesChart series={demandSeries} formatValue={(v) => Math.round(v)} height={240} />
            </Card>

            <Card title="Campaign ROI" subtitle="Spend against attributed demand" bodyClassName="px-0 py-0" className="mb-4">
              {roi.loading && !roi.data ? (
                <Spinner label="Loading campaign ROI" />
              ) : roiRows.length === 0 ? (
                <p className="px-5 py-10 text-center font-body text-sm text-pine-soft">
                  No campaign spend or attributed quotes in this range.
                </p>
              ) : (
                <Table
                  caption="Campaign ROI against ERP quotes and orders"
                  head={
                    <>
                      <Th>Campaign</Th>
                      <Th align="right">Spend</Th>
                      <Th align="right">Meta leads</Th>
                      <Th align="right">Quotes</Th>
                      <Th align="right">Cost / quote</Th>
                      <Th align="right">Orders</Th>
                      <Th align="right">Order value</Th>
                      <Th align="right">ROAS</Th>
                    </>
                  }
                >
                  {roiRows.map((row) => {
                    const spend = Number(row.spend ?? 0);
                    const quotesCount = Number(row.quotes_count ?? 0);
                    const ordersValue = Number(row.orders_value ?? 0);
                    return (
                      <Tr key={row.campaign_id}>
                        <Td>
                          <span className="block max-w-80 truncate font-body text-sm text-pine">
                            {row.campaign_name}
                          </span>
                          <span className="block font-body text-[11px] text-pine-soft">
                            {humanEnum(row.objective)}
                          </span>
                        </Td>
                        <Td numeric>{money(spend, row.currency ?? currency)}</Td>
                        <Td numeric>{Number(row.meta_leads ?? 0)}</Td>
                        <Td numeric>{quotesCount}</Td>
                        <Td numeric>
                          {quotesCount > 0 ? money(spend / quotesCount, row.currency ?? currency) : "—"}
                        </Td>
                        <Td numeric>{Number(row.orders_count ?? 0)}</Td>
                        <Td numeric>{money(ordersValue, row.currency ?? currency)}</Td>
                        <Td numeric>{spend > 0 ? ratio(ordersValue / spend, 2) : "—"}</Td>
                      </Tr>
                    );
                  })}
                </Table>
              )}
            </Card>

            <Card
              title="Attributed quote requests"
              subtitle={`${quoteRows.length} request${quoteRows.length === 1 ? "" : "s"} in this range`}
              bodyClassName="px-0 py-0"
            >
              {quotes.loading && !quotes.data ? (
                <Spinner label="Loading quotes" />
              ) : quoteRows.length === 0 ? (
                <p className="px-5 py-10 text-center font-body text-sm text-pine-soft">
                  No quote requests carried Meta campaign parameters in this range. Check that live ad URLs include
                  the tracking parameters described above.
                </p>
              ) : (
                <Table
                  caption="Quote requests attributed to Meta"
                  head={
                    <>
                      <Th>Received</Th>
                      <Th>Contact</Th>
                      <Th>Enquiry</Th>
                      <Th>Campaign source</Th>
                      <Th>Status</Th>
                      <Th align="right">Quoted</Th>
                    </>
                  }
                >
                  {quoteRows.map((quote) => (
                    <Tr key={quote.id}>
                      <Td>{longDate(quote.created_at)}</Td>
                      <Td>
                        <span className="block font-body text-sm text-pine">{quote.contact_name ?? "—"}</span>
                        {quote.company_name && (
                          <span className="block font-body text-[11px] text-pine-soft">{quote.company_name}</span>
                        )}
                      </Td>
                      <Td>
                        <span className="block max-w-56 truncate font-body text-sm text-pine">
                          {quote.product_type}
                        </span>
                        <span className="block font-body text-[11px] text-pine-soft">{quote.quantity} units</span>
                      </Td>
                      <Td>
                        <span className="block font-body text-xs text-pine">
                          {quote.utm_campaign ?? quote.meta_campaign_id ?? "—"}
                        </span>
                        <span className="block font-body text-[11px] text-pine-soft">
                          {[quote.utm_source, quote.utm_medium].filter(Boolean).join(" / ") || "—"}
                        </span>
                      </Td>
                      <Td>
                        <Badge tone={QUOTE_STATUS_TONE[quote.status] ?? "neutral"}>{humanEnum(quote.status)}</Badge>
                      </Td>
                      <Td numeric>{quote.quoted_price ? money(quote.quoted_price, currency) : "—"}</Td>
                    </Tr>
                  ))}
                </Table>
              )}
            </Card>
          </div>
        </>
      )}
    </>
  );
}

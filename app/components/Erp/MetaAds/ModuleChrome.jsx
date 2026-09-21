"use client";

// The furniture every screen in the module shares: tab row, filter bar, and the two states
// that block the module outright (nothing connected, nothing synced).

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { relativeTime } from "@/lib/meta-ads/format";
import { RANGE_PRESETS } from "@/lib/meta-ads/ranges";
import { syncNow } from "@/lib/meta-ads/api";
import { Alert, Button, EmptyState, Select, inputClass } from "../Ui";
import { useMetaAds } from "./MetaAdsProvider";

const TABS = [
  { label: "Overview", href: "/erp/marketing/meta-ads" },
  { label: "Campaigns", href: "/erp/marketing/meta-ads/campaigns" },
  { label: "Attribution", href: "/erp/marketing/meta-ads/attribution" },
  { label: "Settings", href: "/erp/marketing/meta-ads/settings" },
];

export function MetaAdsTabs() {
  const pathname = usePathname();
  const { params } = useMetaAds();
  const query = params.toString();
  const current = pathname?.replace(/\/+$/, "") || "";

  return TABS.map((tab) => {
    const active = current === tab.href;
    return (
      <Link
        key={tab.href}
        // The account and range ride along, so switching tabs never silently resets the
        // numbers the operator was comparing.
        href={query ? `${tab.href}?${query}` : tab.href}
        aria-current={active ? "page" : undefined}
        className={`-mb-px border-b-2 px-3 py-2 font-body text-sm transition-colors ${
          active
            ? "border-moss font-semibold text-pine"
            : "border-transparent text-pine-soft hover:border-pine/20 hover:text-pine"
        }`}
      >
        {tab.label}
      </Link>
    );
  });
}

/**
 * One row of filters above the content, scoping everything below it. Date range first — it
 * is the control people reach for.
 */
export function FilterBar({ showSync = true }) {
  const { accounts, account, selectAccount, preset, range, selectPreset, selectCustomRange, refreshData } =
    useMetaAds();
  const [customOpen, setCustomOpen] = useState(preset === "custom");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncResult, setSyncResult] = useState(null);

  async function onSync() {
    setSyncing(true);
    setSyncError(null);
    setSyncResult(null);
    try {
      // The window is padded past the visible range because Meta keeps restating the last
      // few days; re-pulling them is the point of a manual sync.
      const days = Math.min(
        90,
        Math.round((Date.parse(range.until) - Date.parse(range.since)) / 86_400_000) + 4,
      );
      const result = await syncNow({ accountId: account?.account_id, days });
      setSyncResult(result);
      refreshData();
    } catch (error) {
      setSyncError(error.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mb-5">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-wrap gap-1 rounded-sm border border-pine/15 bg-bone p-1">
          {RANGE_PRESETS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setCustomOpen(false);
                selectPreset(option.id);
              }}
              aria-pressed={preset === option.id}
              className={`rounded-sm px-2.5 py-1.5 font-body text-xs transition-colors ${
                preset === option.id ? "bg-pine text-bone" : "text-pine-soft hover:bg-pine/6 hover:text-pine"
              }`}
            >
              {option.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCustomOpen((open) => !open)}
            aria-pressed={preset === "custom"}
            aria-expanded={customOpen}
            className={`rounded-sm px-2.5 py-1.5 font-body text-xs transition-colors ${
              preset === "custom" ? "bg-pine text-bone" : "text-pine-soft hover:bg-pine/6 hover:text-pine"
            }`}
          >
            Custom
          </button>
        </div>

        {accounts.length > 1 && (
          <Select
            aria-label="Ad account"
            value={account?.account_id ?? ""}
            onChange={(e) => selectAccount(e.target.value)}
            className="h-9 w-auto py-0"
          >
            {accounts.map((a) => (
              <option key={a.account_id} value={a.account_id}>
                {a.name} · {a.currency}
              </option>
            ))}
          </Select>
        )}

        {showSync && account && (
          <div className="ml-auto flex items-center gap-2">
            <span className="font-body text-[11px] text-pine-soft">
              Synced {relativeTime(account.last_synced_at)}
            </span>
            <Button onClick={onSync} busy={syncing}>
              <RefreshCw size={13} aria-hidden />
              {syncing ? "Syncing" : "Sync now"}
            </Button>
          </div>
        )}
      </div>

      {customOpen && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-sm border border-pine/15 bg-bone p-3">
          <label className="font-body text-xs text-pine-soft">
            From
            <input
              type="date"
              defaultValue={range.since}
              max={range.until}
              onChange={(e) => e.target.value && selectCustomRange(e.target.value, range.until)}
              className={`${inputClass} mt-1 h-9 py-0`}
            />
          </label>
          <label className="font-body text-xs text-pine-soft">
            To
            <input
              type="date"
              defaultValue={range.until}
              onChange={(e) => e.target.value && selectCustomRange(range.since, e.target.value)}
              className={`${inputClass} mt-1 h-9 py-0`}
            />
          </label>
          <p className="font-body text-xs text-pine-soft">
            Synced history only — ranges older than your sync window will read as zero.
          </p>
        </div>
      )}

      {syncError && (
        <div className="mt-3">
          <Alert tone="error" title="Sync failed" onDismiss={() => setSyncError(null)}>
            {syncError}
          </Alert>
        </div>
      )}
      {syncResult && (
        <div className="mt-3">
          <Alert tone="success" title="Sync complete" onDismiss={() => setSyncResult(null)}>
            {Object.entries(syncResult.counts ?? {})
              .map(([key, value]) => `${value} ${key.replace("insights_", "").replace(/_/g, " ")}`)
              .join(" · ")}
          </Alert>
        </div>
      )}
    </div>
  );
}

/** Shown instead of a dashboard when no ad account has been connected yet. */
export function NotConnected() {
  return (
    <EmptyState
      title="No Meta ad account connected"
      action={
        <Link
          href="/erp/marketing/meta-ads/settings"
          className="inline-flex h-9 items-center rounded-sm bg-moss px-4 font-body text-xs font-semibold text-pine transition-colors hover:bg-moss-deep hover:text-bone"
        >
          Go to settings
        </Link>
      }
    >
      An administrator needs to connect the business&rsquo;s Meta account before performance data can be
      pulled in.
    </EmptyState>
  );
}

/** Nudge shown when the data on screen is old enough to mislead. */
export function StaleDataNotice({ account }) {
  // `stale` is computed when the account is loaded (lib/meta-ads/api.js) rather than here,
  // since reading the clock mid-render is impure.
  if (!account?.stale) return null;

  return (
    <div className="mb-4">
      <Alert
        tone="warning"
        title={account.last_synced_at ? "Data is over a day old" : "Nothing has been synced yet"}
      >
        {account.last_synced_at
          ? "Figures below are from the last sync, not live from Meta. Run a sync, or check that the scheduled job is still running."
          : "Run a sync to pull campaigns and daily performance into the ERP."}
      </Alert>
    </div>
  );
}
